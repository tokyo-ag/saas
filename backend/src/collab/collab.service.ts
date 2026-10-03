import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollabService {
  constructor(private prisma: PrismaService) {}

  private normalizeIdentityPart(value?: string | null) {
    return (value ?? '')
      .normalize('NFKC')
      .replace(/[\s　]+/g, '')
      .toLowerCase();
  }

  private duplicateIdentityKeys(member: {
    lineUserId: string;
    lineDisplayName?: string | null;
    linePictureUrl?: string | null;
    name?: string | null;
    gender?: string | null;
  }) {
    const keys: string[] = [];
    if (member.lineUserId) keys.push(`line:${member.lineUserId}`);
    if (member.linePictureUrl) keys.push(`picture:${member.linePictureUrl}`);

    const lineDisplayName = this.normalizeIdentityPart(member.lineDisplayName);
    const name = this.normalizeIdentityPart(member.name);
    const gender = this.normalizeIdentityPart(member.gender);
    // LINEのユーザーIDはプロバイダーが異なると同一人物でも変わる。
    // 名前だけでは別人を巻き込むため、LINE表示名・申込名・性別がすべて
    // 入っていて一致する場合に限り、プロフィール由来の同一人物候補とする。
    if (lineDisplayName && name && gender) {
      keys.push(`profile:${lineDisplayName}:${name}:${gender}`);
    }

    return keys;
  }

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
            lineDisplayName: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { reservedAt: 'asc' }],
    });

    // 自動判定：LINE IDを最優先にしつつ、団体ごとにLINEプロバイダーが
    // 異なる場合でも同一人物を拾えるよう、強いプロフィール一致も併用する。
    const byIdentityKey = new Map<string, typeof reservations>();
    for (const r of reservations) {
      for (const key of this.duplicateIdentityKeys(r.member)) {
        const list = byIdentityKey.get(key) ?? [];
        list.push(r);
        byIdentityKey.set(key, list);
      }
    }
    const autoDuplicateIds = new Set<string>();
    for (const list of byIdentityKey.values()) {
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
          referrer: r.referrer,
          staffNote: r.staffNote,
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

  async updateReservationDetails(
    token: string,
    reservationId: string,
    data: { referrer?: string; staffNote?: string },
  ) {
    await this.findGroupForReservation(token, reservationId);
    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(data.referrer !== undefined && {
          referrer: data.referrer.trim() || null,
        }),
        ...(data.staffNote !== undefined && {
          staffNote: data.staffNote.trim() || null,
        }),
      },
    });

    return {
      id: updated.id,
      referrer: updated.referrer,
      staffNote: updated.staffNote,
    };
  }

  async clearDuplicateOverride(token: string, reservationId: string) {
    await this.findGroupForReservation(token, reservationId);
    await this.prisma.collabDuplicateOverride.deleteMany({
      where: { reservationId },
    });
    return { reservationId, isDuplicateOverride: null };
  }
}
