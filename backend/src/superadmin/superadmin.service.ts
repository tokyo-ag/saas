import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString, IsOptional, IsEnum, IsEmail, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export class CreateTenantDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?: 'free' | 'standard' | 'pro';
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?: 'free' | 'standard' | 'pro';
}

export class BanUserDto {
  @IsString() lineUserId: string;
  @IsOptional() @IsString() reason?: string;
}

@Injectable()
export class SuperadminService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true } },
        organizerAccounts: { select: { email: true }, take: 1 },
      },
    });
    return tenants.map(({ _count, organizerAccounts, ...t }) => ({
      ...t,
      memberCount: _count.members,
      organizerEmail: organizerAccounts[0]?.email ?? null,
    }));
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
    if (tenant.bannedAt) throw new BadRequestException('この団体は永久BANされており復元できません');
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async createTenant(dto: CreateTenantDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const accounts = await this.prisma.organizerAccount.findMany({ where: { email: { not: null } } });
    if (accounts.some(a => a.email?.toLowerCase() === normalizedEmail)) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const id = `tenant-${Date.now()}`;
    return this.prisma.tenant.create({
      data: {
        id,
        name: dto.name,
        description: dto.description,
        plan: dto.plan ?? 'free',
        organizerAccounts: {
          create: { email: normalizedEmail, passwordHash, emailVerifiedAt: new Date() },
        },
      },
    });
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
      },
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
    return this.prisma.bannedLineUser.findMany({ orderBy: { bannedAt: 'desc' } });
  }

  async banUser(dto: BanUserDto) {
    return this.prisma.bannedLineUser.upsert({
      where: { lineUserId: dto.lineUserId },
      create: { lineUserId: dto.lineUserId, reason: dto.reason },
      update: { reason: dto.reason, bannedAt: new Date() },
    });
  }

  async impersonate(tenantId: string): Promise<{ token: string }> {
    const account = await this.prisma.organizerAccount.findFirst({ where: { tenantId } });
    if (!account) throw new NotFoundException('この団体にアカウントがありません');
    const token = this.jwt.sign({ tenantId, accountId: account.id });
    return { token };
  }

  async unbanUser(lineUserId: string) {
    const banned = await this.prisma.bannedLineUser.findUnique({ where: { lineUserId } });
    if (!banned) throw new NotFoundException('Banned user not found');
    await this.prisma.bannedLineUser.delete({ where: { lineUserId } });
    return { message: 'unbanned' };
  }

  async getSupportThreads() {
    const messages = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const threadMap = new Map<string, { lineUserId: string; tenantId: string | null; lastMessage: string; lastAt: Date; unread: number }>();
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
    return Array.from(threadMap.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
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

  async replySupportMessage(lineUserId: string, content: string) {
    const latest = await this.prisma.supportMessage.findFirst({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true },
    });
    return this.prisma.supportMessage.create({
      data: { lineUserId, tenantId: latest?.tenantId ?? null, content, fromUser: false },
    });
  }
}
