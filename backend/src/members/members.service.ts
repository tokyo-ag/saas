import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { name?: string; grade?: string; gender?: string }) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        ...(query.name && { name: { contains: query.name } }),
        ...(query.grade && { grade: query.grade }),
        ...(query.gender && { gender: query.gender }),
      },
      include: {
        _count: { select: { reservations: { where: { status: { in: ['reserved', 'attended'] } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      lineUserId: m.lineUserId,
      name: m.name,
      grade: m.grade,
      gender: m.gender,
      blockedAt: m.blockedAt,
      createdAt: m.createdAt,
      eventCount: m._count.reservations,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
      include: {
        reservations: {
          include: { event: true },
          orderBy: { reservedAt: 'desc' },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async block(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({ where: { id, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.member.update({ where: { id }, data: { blockedAt: new Date() } });
  }

  async unblock(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({ where: { id, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.member.update({ where: { id }, data: { blockedAt: null } });
  }

  async getMessages(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.adminMemberMessage.updateMany({
      where: { memberId, tenantId, fromAdmin: false, read: false },
      data: { read: true },
    });
    return this.prisma.adminMemberMessage.findMany({
      where: { memberId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMessageThreads(tenantId: string) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        adminMessages: { some: {} },
      },
      include: {
        adminMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            adminMessages: {
              where: { fromAdmin: false, read: false },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members
      .map((member) => {
        const lastMessage = member.adminMessages[0];
        return {
          member: {
            id: member.id,
            name: member.name,
            grade: member.grade,
            gender: member.gender,
            lineUserId: member.lineUserId,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                fromAdmin: lastMessage.fromAdmin,
                read: lastMessage.read,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount: member._count.adminMessages,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async sendMessage(tenantId: string, memberId: string, content: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.adminMemberMessage.create({
      data: { tenantId, memberId, content, fromAdmin: true },
    });
  }

  async exportCsv(tenantId: string): Promise<string> {
    const members = await this.findAll(tenantId, {});
    const header = '名前,学年,性別,登録日,参加イベント数';
    const rows = members.map((m) => {
      const date = new Date(m.createdAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
      return `${m.name ?? ''},${m.grade ?? ''},${m.gender ?? ''},${date},${m.eventCount}`;
    });
    return [header, ...rows].join('\n');
  }
}
