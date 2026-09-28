import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollabService {
  constructor(private prisma: PrismaService) {}

  // 合同開催の統合名簿。既存のEvent/Reservation/Memberは一切書き換えず、
  // グループに紐づく全イベントの予約を突き合わせて返す。
  async getCombinedRoster(token: string) {
    const group = await this.prisma.collabGroup.findFirst({
      where: { viewToken: token, active: true },
      include: {
        eventLinks: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                heldAt: true,
                tenantId: true,
                tenant: {
                  select: { id: true, name: true, lineDisplayName: true },
                },
              },
            },
          },
        },
        duplicateOverrides: true,
      },
    });
    if (!group) throw new NotFoundException('名簿が見つかりません');

    const eventIds = group.eventLinks.map((l) => l.eventId);
    const reservations = await this.prisma.reservation.findMany({
      where: { eventId: { in: eventIds }, status: { not: 'cancelled' } },
      include: {
        member: {
          select: {
            name: true,
            grade: true,
            gender: true,
            level: true,
            comment: true,
            linePictureUrl: true,
            lineUserId: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { reservedAt: 'asc' }],
    });

    // 自動判定：グループ内で同じMember.lineUserIdを持つ予約が2件以上あれば重複クラスタとみなす
    const byLineUserId = new Map<string, typeof reservations>();
    for (const r of reservations) {
      if (!r.member.lineUserId) continue;
      const list = byLineUserId.get(r.member.lineUserId) ?? [];
      list.push(r);
      byLineUserId.set(r.member.lineUserId, list);
    }
    const autoDuplicateIds = new Set<string>();
    for (const list of byLineUserId.values()) {
      if (list.length > 1) list.forEach((r) => autoDuplicateIds.add(r.id));
    }

    const overrideById = new Map(
      group.duplicateOverrides.map((o) => [o.reservationId, o.isDuplicate]),
    );
    const eventById = new Map(
      group.eventLinks.map((l) => [l.eventId, l.event]),
    );

    const tenantsSeen = new Map<
      string,
      {
        tenantId: string;
        tenantName: string;
        eventId: string;
        eventTitle: string;
        heldAt: Date;
      }
    >();
    for (const link of group.eventLinks) {
      if (!tenantsSeen.has(link.event.tenantId)) {
        tenantsSeen.set(link.event.tenantId, {
          tenantId: link.event.tenantId,
          tenantName:
            link.event.tenant.lineDisplayName ?? link.event.tenant.name,
          eventId: link.eventId,
          eventTitle: link.event.title,
          heldAt: link.event.heldAt,
        });
      }
    }

    return {
      group: { label: group.label },
      tenants: [...tenantsSeen.values()],
      participants: reservations.map((r) => {
        const event = eventById.get(r.eventId)!;
        const override = overrideById.get(r.id) ?? null;
        return {
          id: r.id,
          tenantId: event.tenantId,
          tenantName: event.tenant.lineDisplayName ?? event.tenant.name,
          eventId: r.eventId,
          name: r.member.name,
          grade: r.member.grade,
          gender: r.member.gender,
          level: r.member.level,
          comment: r.member.comment,
          linePictureUrl: r.member.linePictureUrl,
          status: r.status,
          waitlistOrder: r.waitlistOrder,
          isDuplicateAuto: autoDuplicateIds.has(r.id),
          isDuplicateOverride: override,
          isDuplicate: override ?? autoDuplicateIds.has(r.id),
        };
      }),
    };
  }

  private async findGroupForReservation(token: string, reservationId: string) {
    const group = await this.prisma.collabGroup.findFirst({
      where: { viewToken: token, active: true },
      include: { eventLinks: true },
    });
    if (!group) throw new NotFoundException('名簿が見つかりません');

    const eventIds = group.eventLinks.map((l) => l.eventId);
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, eventId: { in: eventIds } },
    });
    if (!reservation) throw new NotFoundException('参加者が見つかりません');

    return group;
  }

  async setDuplicateOverride(
    token: string,
    reservationId: string,
    isDuplicate: boolean,
  ) {
    const group = await this.findGroupForReservation(token, reservationId);
    await this.prisma.collabDuplicateOverride.upsert({
      where: { reservationId },
      create: { collabGroupId: group.id, reservationId, isDuplicate },
      update: { isDuplicate },
    });
    return { reservationId, isDuplicateOverride: isDuplicate };
  }

  async clearDuplicateOverride(token: string, reservationId: string) {
    await this.findGroupForReservation(token, reservationId);
    await this.prisma.collabDuplicateOverride.deleteMany({
      where: { reservationId },
    });
    return { reservationId, isDuplicateOverride: null };
  }
}
