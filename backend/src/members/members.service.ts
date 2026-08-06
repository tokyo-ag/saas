import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';

@Injectable()
export class MembersService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  async findAll(
    tenantId: string,
    query: { name?: string; grade?: string; gender?: string; level?: string },
  ) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        ...(query.name && { name: { contains: query.name } }),
        ...(query.grade && { grade: query.grade }),
        ...(query.gender && { gender: query.gender }),
        ...(query.level && { level: query.level }),
      },
      include: {
        _count: {
          select: {
            reservations: {
              where: { status: { in: ['reserved', 'attended'] } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      lineDisplayName: m.lineDisplayName,
      linePictureUrl: m.linePictureUrl,
      name: m.name,
      grade: m.grade,
      gender: m.gender,
      level: m.level,
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
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.member.update({
      where: { id },
      data: { blockedAt: new Date() },
    });
  }

  async unblock(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.member.update({
      where: { id },
      data: { blockedAt: null },
    });
  }

  // 参加者情報を完全に削除する（予約履歴・チャット履歴含む、元に戻せない）。
  // ReservationはMemberとcascade設定が無いため先に手動で削除する。
  async remove(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.$transaction([
      this.prisma.reservation.deleteMany({ where: { memberId: id } }),
      this.prisma.member.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  async syncLineProfiles(tenantId: string): Promise<{ updated: number }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lineChannelAccessToken: true },
    });
    if (!tenant?.lineChannelAccessToken) return { updated: 0 };

    const members = await this.prisma.member.findMany({ where: { tenantId } });
    let updated = 0;
    for (const member of members) {
      if (!member.messagingLineUserId) continue;
      const profile = await this.lineMessaging.getLineProfile(
        tenant.lineChannelAccessToken,
        member.messagingLineUserId,
      );
      if (!profile) continue;
      await this.prisma.member.update({
        where: { id: member.id },
        data: {
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl ?? null,
        },
      });
      updated++;
    }
    return { updated };
  }
}
