import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() lineChannelId?: string;
  @IsOptional() @IsString() lineChannelSecret?: string;
  @IsOptional() @IsString() lineChannelAccessToken?: string;
  @IsOptional() @IsString() liffId?: string;
  @IsOptional() @IsString() organizerLineUserId?: string;
  @IsOptional() @IsString() stripePublishableKey?: string;
  @IsOptional() @IsString() stripeSecretKey?: string;
  @IsOptional() @IsString() stripeWebhookSecret?: string;
}

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    await this.findOne(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.lineChannelId !== undefined && { lineChannelId: dto.lineChannelId }),
        ...(dto.lineChannelSecret !== undefined && { lineChannelSecret: dto.lineChannelSecret }),
        ...(dto.lineChannelAccessToken !== undefined && { lineChannelAccessToken: dto.lineChannelAccessToken }),
        ...(dto.liffId !== undefined && { liffId: dto.liffId }),
        ...(dto.organizerLineUserId !== undefined && { organizerLineUserId: dto.organizerLineUserId || null }),
        ...(dto.stripePublishableKey !== undefined && { stripePublishableKey: dto.stripePublishableKey || null }),
        ...(dto.stripeSecretKey !== undefined && { stripeSecretKey: dto.stripeSecretKey || null }),
        ...(dto.stripeWebhookSecret !== undefined && { stripeWebhookSecret: dto.stripeWebhookSecret || null }),
      },
    });
  }

  async getMemberCount(tenantId: string) {
    return this.prisma.member.count({ where: { tenantId } });
  }

  async getGrowthData(tenantId: string) {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}月` };
    });

    const results = await Promise.all(
      months.map(async ({ year, month, label }) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        const [members, reservations] = await Promise.all([
          this.prisma.member.count({ where: { tenantId, createdAt: { gte: start, lt: end } } }),
          this.prisma.reservation.count({
            where: { tenantId, reservedAt: { gte: start, lt: end }, status: { notIn: ['cancelled'] } },
          }),
        ]);
        return { label, members, reservations };
      }),
    );
    return results;
  }

  async getActivityFeed(tenantId: string) {
    const [reservations, members] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { tenantId },
        orderBy: { reservedAt: 'desc' },
        take: 20,
        include: {
          member: { select: { name: true } },
          event: { select: { title: true, capacity: true } },
        },
      }),
      this.prisma.member.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { name: true, createdAt: true },
      }),
    ]);

    type Activity = { type: string; text: string; at: Date };
    const activities: Activity[] = [];

    for (const r of reservations) {
      const name = r.member.name ?? '匿名';
      const title = r.event.title;
      if (r.status === 'cancelled') {
        activities.push({ type: 'cancel', text: `${name}さんが「${title}」をキャンセルしました`, at: r.reservedAt });
      } else if (r.status === 'waitlisted') {
        activities.push({ type: 'waitlist', text: `${name}さんが「${title}」のキャンセル待ちに登録しました`, at: r.reservedAt });
      } else {
        activities.push({ type: 'reserve', text: `${name}さんが「${title}」を予約しました`, at: r.reservedAt });
      }
    }

    for (const m of members) {
      activities.push({ type: 'member', text: `${m.name ?? '匿名'}さんが新規メンバーになりました`, at: m.createdAt });
    }

    return activities
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 20)
      .map((a) => ({ ...a, at: a.at.toISOString() }));
  }

  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      memberCount,
      thisMonthEventCount,
      totalReservationCount,
      thisMonthReservationCount,
      paidReservations,
    ] = await Promise.all([
      this.prisma.member.count({ where: { tenantId } }),
      this.prisma.event.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
      this.prisma.reservation.count({ where: { tenantId, status: { notIn: ['cancelled'] } } }),
      this.prisma.reservation.count({
        where: { tenantId, status: { notIn: ['cancelled'] }, reservedAt: { gte: monthStart } },
      }),
      this.prisma.reservation.findMany({
        where: { tenantId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
        include: { event: { select: { price: true } } },
      }),
    ]);

    const totalRevenue = paidReservations.reduce((sum, r) => sum + r.event.price, 0);

    return {
      memberCount,
      thisMonthEventCount,
      totalReservationCount,
      thisMonthReservationCount,
      totalRevenue,
    };
  }

  async syncLineProfile(tenantId: string) {
    const tenant = await this.findOne(tenantId);
    if (!tenant.lineChannelAccessToken) {
      throw new BadRequestException('LINE Channel Access Tokenが設定されていません');
    }

    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${tenant.lineChannelAccessToken}` },
    });
    if (!res.ok) {
      throw new BadRequestException('LINEアカウント情報の取得に失敗しました');
    }
    const data = await res.json() as { displayName: string; pictureUrl?: string };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        lineDisplayName: data.displayName,
        linePictureUrl: data.pictureUrl ?? null,
      },
    });
  }
}
