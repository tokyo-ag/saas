import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateTenantDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?: 'free' | 'standard' | 'pro';
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
  constructor(private prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
    const counts = await Promise.all(
      tenants.map((t) =>
        this.prisma.member.count({ where: { tenantId: t.id } }).then((c) => ({ id: t.id, memberCount: c })),
      ),
    );
    const countMap = Object.fromEntries(counts.map((c) => [c.id, c.memberCount]));
    return tenants.map((t) => ({ ...t, memberCount: countMap[t.id] ?? 0 }));
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
    const id = `tenant-${Date.now()}`;
    return this.prisma.tenant.create({
      data: { id, name: dto.name, description: dto.description, plan: dto.plan ?? 'free' },
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
    return this.prisma.supportMessage.create({
      data: { lineUserId, content, fromUser: false },
    });
  }
}
