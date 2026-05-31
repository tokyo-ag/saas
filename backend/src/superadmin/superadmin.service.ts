import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export class CreateTenantDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?:
    | 'free'
    | 'standard'
    | 'pro';
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?:
    | 'free'
    | 'standard'
    | 'pro';
  @IsOptional() @IsString() code?: string;
}

export class BanUserDto {
  @IsString() lineUserId: string;
  @IsOptional() @IsString() reason?: string;
}

@Injectable()
export class SuperadminService implements OnApplicationBootstrap {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async onApplicationBootstrap() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, code: true },
    });
    for (const t of tenants) {
      if (!t.code || !/^\d{8}$/.test(t.code)) {
        const code = await this.generateUniqueCode();
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: { code },
        });
      }
    }
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        plan: true,
        bannedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        lineChannelAccessToken: true,
        _count: { select: { members: true } },
        organizerAccounts: { select: { email: true }, take: 1 },
      },
    });
    return tenants.map(
      ({ _count, organizerAccounts, lineChannelAccessToken, ...t }) => ({
        ...t,
        lineConfigured: Boolean(lineChannelAccessToken),
        memberCount: _count.members,
        organizerEmail: organizerAccounts[0]?.email ?? null,
      }),
    );
  }

  async deactivateTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async banTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { bannedAt: new Date(), deletedAt: new Date() },
    });
  }

  async restoreTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.bannedAt)
      throw new BadRequestException(
        'この団体は永久BANされており復元できません',
      );
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await this.prisma.tenant.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('コード生成に失敗しました');
  }

  async createTenant(dto: CreateTenantDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const id = `tenant-${Date.now()}`;
    const code = await this.generateUniqueCode();
    const tenant = await this.prisma.tenant.create({
      data: {
        id,
        code,
        name: dto.name,
        description: dto.description,
        plan: dto.plan ?? 'free',
        organizerAccounts: {
          create: {
            email: normalizedEmail,
            passwordHash,
            emailVerifiedAt: new Date(),
          },
        },
      },
      select: { id: true, name: true, code: true, plan: true, createdAt: true },
    });
    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.plan !== undefined && { plan: dto.plan }),
        ...(dto.code !== undefined && {
          code: dto.code.trim().toLowerCase() || null,
        }),
      },
      select: { id: true, name: true, code: true, plan: true, updatedAt: true },
    });
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.prisma.reservation.deleteMany({ where: { tenantId: id } });
    await this.prisma.member.deleteMany({ where: { tenantId: id } });
    await this.prisma.event.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'deleted' };
  }

  async listBannedUsers() {
    return this.prisma.bannedLineUser.findMany({
      orderBy: { bannedAt: 'desc' },
    });
  }

  async banUser(dto: BanUserDto) {
    return this.prisma.bannedLineUser.upsert({
      where: { lineUserId: dto.lineUserId },
      create: { lineUserId: dto.lineUserId, reason: dto.reason },
      update: { reason: dto.reason, bannedAt: new Date() },
    });
  }

  async impersonate(tenantId: string): Promise<{ token: string }> {
    const account = await this.prisma.organizerAccount.findFirst({
      where: { tenantId },
    });
    if (!account)
      throw new NotFoundException('この団体にアカウントがありません');
    const token = this.jwt.sign({ tenantId, accountId: account.id });
    return { token };
  }

  async unbanUser(lineUserId: string) {
    const banned = await this.prisma.bannedLineUser.findUnique({
      where: { lineUserId },
    });
    if (!banned) throw new NotFoundException('Banned user not found');
    await this.prisma.bannedLineUser.delete({ where: { lineUserId } });
    return { message: 'unbanned' };
  }

  async getSupportThreads() {
    const messages = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const threadMap = new Map<
      string,
      {
        lineUserId: string;
        tenantId: string | null;
        lastMessage: string;
        lastAt: Date;
        unread: number;
      }
    >();
    for (const m of messages) {
      if (!threadMap.has(m.lineUserId)) {
        threadMap.set(m.lineUserId, {
          lineUserId: m.lineUserId,
          tenantId: m.tenantId,
          lastMessage: m.content,
          lastAt: m.createdAt,
          unread: 0,
        });
      }
      if (m.fromUser && !m.read) {
        threadMap.get(m.lineUserId)!.unread++;
      }
    }
    return Array.from(threadMap.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
    );
  }

  async getSupportMessages(lineUserId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { lineUserId, fromUser: true, read: false },
      data: { read: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getErrorLogs() {
    return this.prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async clearErrorLogs() {
    await this.prisma.errorLog.deleteMany();
    return { message: 'cleared' };
  }

  async replySupportMessage(lineUserId: string, content: string) {
    const latest = await this.prisma.supportMessage.findFirst({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true },
    });
    return this.prisma.supportMessage.create({
      data: {
        lineUserId,
        tenantId: latest?.tenantId ?? null,
        content,
        fromUser: false,
      },
    });
  }
}
