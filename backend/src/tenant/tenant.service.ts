import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Stripe from 'stripe';
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
  @IsOptional() @IsString() liffEventView?: string;
  @IsOptional() @IsString() themeColor?: string;
  @IsOptional() @IsString() iconUrl?: string;
  @IsOptional() @IsString() code?: string;
}

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private toSafeTenant<
    T extends {
      lineChannelSecret: unknown;
      lineChannelAccessToken: unknown;
      stripeSecretKey: unknown;
      stripeWebhookSecret: unknown;
    },
  >(tenant: T) {
    // Keep secret values server-side while still letting the UI know whether setup is complete.

    const {
      lineChannelSecret: _lineChannelSecret,
      lineChannelAccessToken: _lineChannelAccessToken,
      stripeSecretKey: _stripeSecretKey,
      stripeWebhookSecret: _stripeWebhookSecret,
      ...safe
    } = tenant;
    return {
      ...safe,
      lineConfigured: Boolean(_lineChannelAccessToken),
    };
  }

  private async findRaw(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findOne(tenantId: string) {
    const tenant = await this.findRaw(tenantId);
    return this.toSafeTenant(tenant);
  }

  private assertSensitiveSettingsReconfirmed(
    tenantId: string,
    accountId: string,
    dto: UpdateTenantDto,
    reauthRequired: boolean,
    reauthToken?: string,
  ) {
    const changesSensitiveLineSettings = [
      dto.lineChannelId,
      dto.lineChannelSecret,
      dto.lineChannelAccessToken,
      dto.liffId,
      dto.organizerLineUserId,
    ].some((value) => value !== undefined);

    if (!changesSensitiveLineSettings || !reauthRequired) return;
    if (!reauthToken)
      throw new UnauthorizedException('LINE設定を編集するには再認証が必要です');

    try {
      const payload = this.jwtService.verify<{
        tenantId: string;
        accountId: string;
        purpose?: string;
      }>(reauthToken);
      if (
        payload.tenantId !== tenantId ||
        payload.accountId !== accountId ||
        payload.purpose !== 'sensitive-settings'
      ) {
        throw new Error('invalid reauth token');
      }
    } catch {
      throw new UnauthorizedException(
        '再認証の有効期限が切れました。もう一度確認してください',
      );
    }
  }

  async update(
    tenantId: string,
    dto: UpdateTenantDto,
    accountId: string,
    reauthToken?: string,
  ) {
    const tenant = await this.findRaw(tenantId);

    if (dto.code !== undefined) {
      const slug = dto.code.trim().toLowerCase();
      if (
        slug &&
        !/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug) &&
        !/^[a-z0-9]{2,32}$/.test(slug)
      ) {
        throw new BadRequestException(
          'コードは英小文字・数字・ハイフンのみ使用できます（2〜32文字）',
        );
      }
      if (slug) {
        const conflict = await this.prisma.tenant.findFirst({
          where: { code: slug, NOT: { id: tenantId } },
        });
        if (conflict)
          throw new ConflictException('そのコードは既に使用されています');
      }
      dto = { ...dto, code: slug || undefined };
    }

    const changesLineSettings = [
      dto.lineChannelId,
      dto.lineChannelSecret,
      dto.lineChannelAccessToken,
      dto.liffId,
      dto.organizerLineUserId,
    ].some((v) => v !== undefined);
    const changesStripeSettings = [
      dto.stripePublishableKey,
      dto.stripeSecretKey,
      dto.stripeWebhookSecret,
    ].some((v) => v !== undefined);
    if (changesLineSettings && tenant.plan !== 'pro') {
      throw new ForbiddenException(
        'LINE API設定はPROプランでご利用いただけます。',
      );
    }
    if (changesStripeSettings && tenant.plan !== 'pro') {
      throw new ForbiddenException(
        'Stripe決済設定はPROプランでご利用いただけます。',
      );
    }

    this.assertSensitiveSettingsReconfirmed(
      tenantId,
      accountId,
      dto,
      Boolean(tenant.lineChannelAccessToken),
      reauthToken,
    );
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.lineChannelId !== undefined && {
          lineChannelId: dto.lineChannelId.trim() || null,
        }),
        ...(dto.lineChannelSecret !== undefined && {
          lineChannelSecret: dto.lineChannelSecret.trim() || null,
        }),
        ...(dto.lineChannelAccessToken !== undefined && {
          lineChannelAccessToken: dto.lineChannelAccessToken.trim() || null,
        }),
        ...(dto.liffId !== undefined && { liffId: dto.liffId.trim() || null }),
        ...(dto.organizerLineUserId !== undefined && {
          organizerLineUserId: dto.organizerLineUserId || null,
        }),
        ...(dto.stripePublishableKey !== undefined && {
          stripePublishableKey: dto.stripePublishableKey || null,
        }),
        ...(dto.stripeSecretKey !== undefined && {
          stripeSecretKey: dto.stripeSecretKey || null,
        }),
        ...(dto.stripeWebhookSecret !== undefined && {
          stripeWebhookSecret: dto.stripeWebhookSecret || null,
        }),
        ...(dto.liffEventView !== undefined && {
          liffEventView: dto.liffEventView,
        }),
        ...(dto.themeColor !== undefined && { themeColor: dto.themeColor }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl || null }),
        ...(dto.code !== undefined && { code: dto.code || null }),
      },
    });
    return this.toSafeTenant(updated);
  }

  async getMemberCount(tenantId: string) {
    return this.prisma.member.count({ where: { tenantId } });
  }

  async getGrowthData(tenantId: string) {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getMonth() + 1}月`,
      };
    });

    const results = await Promise.all(
      months.map(async ({ year, month, label }) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        const [members, reservations] = await Promise.all([
          this.prisma.member.count({
            where: { tenantId, createdAt: { gte: start, lt: end } },
          }),
          this.prisma.reservation.count({
            where: {
              tenantId,
              reservedAt: { gte: start, lt: end },
              status: { notIn: ['cancelled'] },
            },
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
        activities.push({
          type: 'cancel',
          text: `${name}さんが「${title}」をキャンセルしました`,
          at: r.reservedAt,
        });
      } else if (r.status === 'waitlisted') {
        activities.push({
          type: 'waitlist',
          text: `${name}さんが「${title}」のキャンセル待ちに登録しました`,
          at: r.reservedAt,
        });
      } else {
        activities.push({
          type: 'reserve',
          text: `${name}さんが「${title}」を予約しました`,
          at: r.reservedAt,
        });
      }
    }

    for (const m of members) {
      activities.push({
        type: 'member',
        text: `${m.name ?? '匿名'}さんが新規メンバーになりました`,
        at: m.createdAt,
      });
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
      this.prisma.event.count({
        where: { tenantId, createdAt: { gte: monthStart } },
      }),
      this.prisma.reservation.count({
        where: { tenantId, status: { notIn: ['cancelled'] } },
      }),
      this.prisma.reservation.count({
        where: {
          tenantId,
          status: { notIn: ['cancelled'] },
          reservedAt: { gte: monthStart },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          tenantId,
          status: { in: ['reserved', 'attended', 'waiting_payment'] },
        },
        include: { event: { select: { price: true } } },
      }),
    ]);

    const totalRevenue = paidReservations.reduce(
      (sum, r) => sum + r.event.price,
      0,
    );

    return {
      memberCount,
      thisMonthEventCount,
      totalReservationCount,
      thisMonthReservationCount,
      totalRevenue,
    };
  }

  async syncLineProfile(tenantId: string) {
    const tenant = await this.findRaw(tenantId);
    if (!tenant.lineChannelAccessToken) {
      throw new BadRequestException(
        'LINE Channel Access Tokenが設定されていません',
      );
    }

    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${tenant.lineChannelAccessToken}` },
    });
    if (!res.ok) {
      throw new BadRequestException('LINEアカウント情報の取得に失敗しました');
    }
    const data = (await res.json()) as {
      displayName: string;
      pictureUrl?: string;
    };

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        lineDisplayName: data.displayName,
        linePictureUrl: data.pictureUrl ?? null,
      },
    });
    return this.toSafeTenant(updated);
  }

  private supportThreadId(tenantId: string) {
    return `tenant:${tenantId}`;
  }

  async getSupportMessages(tenantId: string) {
    await this.findOne(tenantId);
    const lineUserId = this.supportThreadId(tenantId);
    await this.prisma.supportMessage.updateMany({
      where: { lineUserId, fromUser: false, read: false },
      data: { read: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendSupportMessage(tenantId: string, content: string) {
    await this.findOne(tenantId);
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('メッセージを入力してください');
    return this.prisma.supportMessage.create({
      data: {
        tenantId,
        lineUserId: this.supportThreadId(tenantId),
        content: trimmed,
        fromUser: true,
      },
    });
  }

  async createBillingCheckout(tenantId: string, plan: 'standard' | 'pro') {
    const secretKey = process.env.STRIPE_BILLING_SECRET_KEY;
    if (!secretKey)
      throw new InternalServerErrorException('Stripe Billing not configured');

    const priceId =
      plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_STANDARD_PRICE_ID;
    if (!priceId)
      throw new InternalServerErrorException(
        `Price ID for plan "${plan}" not configured`,
      );

    const tenant = await this.findOne(tenantId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const stripe = new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: tenant.stripeCustomerId ?? undefined,
      success_url: `${frontendUrl}/admin/settings/plan?success=true`,
      cancel_url: `${frontendUrl}/admin/settings/plan`,
      metadata: { tenantId, plan },
      subscription_data: { metadata: { tenantId, plan } },
    });

    return { url: session.url };
  }
}
