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
