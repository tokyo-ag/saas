import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';
import { StripeService } from '../stripe/stripe.service';
export class CreateReservationDto {
  @IsString() eventId!: string;
  @IsString() lineUserId!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() gender?: string;
}

export class SubmitReviewDto {
  @IsString() lineUserId!: string;
  @IsString() content!: string;
}

@Injectable()
export class LiffService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
    private stripeService: StripeService,
  ) {}

  // テナント公開情報（認証不要）
  async getTenantInfo(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException('テナントが見つかりません');
    return {
      id: tenant.id,
      name: tenant.name,
      description: tenant.description,
      lineDisplayName: tenant.lineDisplayName,
      linePictureUrl: tenant.linePictureUrl,
      lineChannelId: tenant.lineChannelId,
      liffEventView: tenant.liffEventView,
      themeColor: tenant.themeColor,
    };
  }

  // イベント一覧（status=open のものだけ）
  async getEvents(tenantId: string, lineUserId?: string) {
    const events = await this.prisma.event.findMany({
      where: { tenantId, status: 'open' },
      include: {
        reservations: {
          where: { status: { in: ['reserved', 'attended', 'waiting_payment'] } },
          select: { id: true },
        },
      },
      orderBy: { heldAt: 'asc' },
    });

    const mapped = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      heldAt: e.heldAt,
      endAt: e.endAt,
      location: e.location,
      capacity: e.capacity,
      status: e.status,
      price: e.price,
      priceMale: e.priceMale,
      priceFemale: e.priceFemale,
      paymentRequired: e.paymentRequired,
      reservedCount: e.reservations.length,
      imageUrl: e.imageUrl,
      iconUrl: e.iconUrl,
      friendAttendees: [] as { id: string; name: string | null }[],
    }));

    if (!lineUserId) return mapped;

    const me = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!me) return mapped;

    const connections = await this.prisma.connection.findMany({
      where: { OR: [{ member1Id: me.id }, { member2Id: me.id }] },
    });
    const partnerIds = connections.map((c) =>
      c.member1Id === me.id ? c.member2Id : c.member1Id,
    );
    if (partnerIds.length === 0) return mapped;

    const partners = await this.prisma.member.findMany({
      where: { id: { in: partnerIds }, showEventsToConnections: true },
      select: { id: true, name: true },
    });
    if (partners.length === 0) return mapped;

    const partnerReservations = await this.prisma.reservation.findMany({
      where: {
        memberId: { in: partners.map((p) => p.id) },
        tenantId,
        status: { in: ['reserved', 'waitlisted'] },
      },
      select: { eventId: true, memberId: true },
    });

    const partnerMap = new Map(partners.map((p) => [p.id, p]));
    return mapped.map((event) => ({
      ...event,
      friendAttendees: partnerReservations
        .filter((r) => r.eventId === event.id)
        .map((r) => partnerMap.get(r.memberId)!)
        .filter(Boolean),
    }));
  }

  // イベント詳細1件
  async getEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const reservedCount = await this.prisma.reservation.count({
      where: { eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
    });

    const reviews = await this.getPublishedReviews(tenantId, eventId);

    return { ...event, reservedCount, reviews };
  }

  async getPublishedReviews(tenantId: string, eventId: string) {
    await this.ensureEventExists(tenantId, eventId);
    const reviews = await this.prisma.eventReview.findMany({
      where: { tenantId, eventId, isPublished: true },
      include: { member: { select: { name: true, grade: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return reviews.map((review) => ({
      id: review.id,
      content: review.content,
      createdAt: review.createdAt,
      memberName: review.member.name,
      memberGrade: review.member.grade,
    }));
  }

  async getMyReview(tenantId: string, eventId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) return null;

    return this.prisma.eventReview.findUnique({
      where: { eventId_memberId: { eventId, memberId: member.id } },
    });
  }

  async submitReview(tenantId: string, eventId: string, dto: SubmitReviewDto) {
    const content = dto.content.trim();
    if (content.length < 5 || content.length > 300) {
      throw new BadRequestException('感想は5文字以上300文字以内で入力してください');
    }

    await this.ensureEventExists(tenantId, eventId);

    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId: dto.lineUserId } },
    });
    if (!member) throw new NotFoundException('メンバーが見つかりません');

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        eventId,
        memberId: member.id,
        status: { in: ['reserved', 'attended'] },
      },
    });
    if (!reservation) {
      throw new ForbiddenException('予約済みまたは参加済みのイベントにのみ感想を投稿できます');
    }

    return this.prisma.eventReview.upsert({
      where: { eventId_memberId: { eventId, memberId: member.id } },
      create: { tenantId, eventId, memberId: member.id, content, isPublished: false },
      update: { content, isPublished: false },
    });
  }

  // 予約登録（重複チェック・キャンセル待ち・LINE通知込み）
  async createReservation(tenantId: string, dto: CreateReservationDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, tenantId, status: 'open' },
    });
    if (!event) throw new NotFoundException('Event not found or not open');

    // グローバルBAN チェック
    const globalBan = await this.prisma.bannedLineUser.findUnique({ where: { lineUserId: dto.lineUserId } });
    if (globalBan) throw new ForbiddenException('このアカウントは利用できません');

    // フリープラン：参加者50人上限チェック
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.plan === 'free') {
      const memberCount = await this.prisma.member.count({ where: { tenantId } });
      if (memberCount >= 50) {
        throw new ForbiddenException('参加者数の上限（50人）に達しました。スタンダードプランにアップグレードしてください。');
      }
    }

    // 参加者を登録 or 情報更新（LINEユーザーIDで一意に管理）
    let member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId: dto.lineUserId } },
    });

    const lineProfile = await this.lineMessaging.getLineProfile(
      tenant?.lineChannelAccessToken ?? '',
      dto.lineUserId,
    );

    if (!member) {
      if (!dto.name || !dto.grade || !dto.gender) {
        throw new BadRequestException('初回予約時はお名前・学年・性別を入力してください');
      }
      member = await this.prisma.member.create({
        data: {
          tenantId,
          lineUserId: dto.lineUserId,
          name: dto.name,
          grade: dto.grade,
          gender: dto.gender,
          ...(lineProfile && {
            lineDisplayName: lineProfile.displayName,
            linePictureUrl: lineProfile.pictureUrl ?? null,
          }),
        },
      });
    } else {
      member = await this.prisma.member.update({
        where: { id: member.id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.grade && { grade: dto.grade }),
          ...(dto.gender && { gender: dto.gender }),
          ...(lineProfile && {
            lineDisplayName: lineProfile.displayName,
            linePictureUrl: lineProfile.pictureUrl ?? null,
          }),
        },
      });
    }

    // テナントブロックチェック
    if (member.blockedAt) throw new ForbiddenException('この団体から利用制限されています');

    // 同じイベントへの重複予約チェック
    const existingCount = await this.prisma.reservation.count({
      where: { memberId: member.id, eventId: dto.eventId, status: { not: 'cancelled' } },
    });
    if (existingCount >= 1) {
      throw new ConflictException('このイベントはすでに予約済みです');
    }

    // 同じ日の別イベントへの予約チェック（JST基準）
    const jstOffset = 9 * 60 * 60 * 1000;
    const eventDateJST = new Date(event.heldAt.getTime() + jstOffset);
    const dayStart = new Date(
      Date.UTC(eventDateJST.getUTCFullYear(), eventDateJST.getUTCMonth(), eventDateJST.getUTCDate()) - jstOffset,
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const sameDayReservation = await this.prisma.reservation.findFirst({
      where: {
        memberId: member.id,
        tenantId,
        eventId: { not: dto.eventId },
        status: { in: ['reserved', 'attended', 'waiting_payment', 'waitlisted'] },
        event: { heldAt: { gte: dayStart, lt: dayEnd } },
      },
    });
    if (sameDayReservation) {
      throw new ConflictException('同じ日に別のイベントへの予約があるため、予約できません');
    }

    // 定員チェック
    const reservedCount = await this.prisma.reservation.count({
      where: { eventId: dto.eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
    });
    const isFull = event.capacity !== null && reservedCount >= event.capacity;

    // 前払い必須のイベントは満席なら予約不可
    if (isFull && event.paymentRequired) {
      throw new BadRequestException('満席のため予約できません');
    }

    const effectivePrice = (event.priceMale != null && event.priceFemale != null)
      ? (member.gender === '男性' ? event.priceMale : member.gender === '女性' ? event.priceFemale : Math.max(event.priceMale, event.priceFemale))
      : event.price;

    const needsPayment = event.paymentRequired && effectivePrice > 0 && !isFull;
    const status: ReservationStatus = isFull
      ? 'waitlisted'
      : needsPayment
        ? 'waiting_payment'
        : 'reserved';
    let waitlistOrder: number | null = null;

    if (status === 'waitlisted') {
      const maxOrder = await this.prisma.reservation.aggregate({
        where: { eventId: dto.eventId, status: 'waitlisted' },
        _max: { waitlistOrder: true },
      });
      waitlistOrder = (maxOrder._max.waitlistOrder ?? 0) + 1;
    }

    const reservation = await this.prisma.reservation.create({
      data: { tenantId, eventId: dto.eventId, memberId: member.id, status, waitlistOrder },
    });

    // Stripe 決済セッション作成
    let stripeCheckoutUrl: string | undefined;
    if (status === 'waiting_payment') {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.stripeSecretKey) {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const session = await this.stripeService.createCheckoutSession(tenant.stripeSecretKey, {
          eventTitle: event.title,
          price: effectivePrice,
          reservationId: reservation.id,
          tenantId,
          successUrl: `${frontendUrl}/liff/${tenantId}/events/${event.id}/done?status=reserved`,
          cancelUrl: `${frontendUrl}/liff/${tenantId}/events/${event.id}/reserve`,
        });
        stripeCheckoutUrl = session.url ?? undefined;
        await this.prisma.reservation.update({
          where: { id: reservation.id },
          data: { stripePaymentIntentId: session.id },
        });
      }
    }

    // LINE通知
    if (event.notifyOnReserve && status !== 'waiting_payment') {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      const token = tenant?.lineChannelAccessToken ?? '';
      if (status === 'reserved') {
        await this.lineMessaging.sendReservationConfirm(
          token, dto.lineUserId,
          event.title, event.heldAt, event.location,
          event.price, event.description,
        );
      } else {
        await this.lineMessaging.sendWaitlistRegistered(
          token, dto.lineUserId,
          event.title, waitlistOrder!,
        );
      }
    }

    // 通知（ベル）＋TALKに予約詳細を送信
    if (event.notifyOnReserveApp && status !== 'waiting_payment') {
      const dateStr = new Date(event.heldAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const descText = event.description
        ? event.description.slice(0, 300) + (event.description.length > 300 ? '…' : '')
        : '';

      // 通知（3行：イベント名・日時・TALK誘導）
      const notifBody = status === 'reserved'
        ? `「${event.title}」に予約しました\n日時：${dateStr}\n詳細はTALKをご確認ください`
        : `「${event.title}」キャンセル待ち${waitlistOrder}番目\n日時：${dateStr}\n詳細はTALKをご確認ください`;
      await this.prisma.notification.create({
        data: { tenantId, memberId: member.id, title: '予約完了', body: notifBody },
      });

      // TALK（詳細・適切な改行）
      const talkContent = status === 'reserved'
        ? [
            `【予約完了】`,
            ``,
            `${event.title}`,
            ``,
            `📅 ${dateStr}`,
            `📍 ${event.location}`,
            ...(descText ? [``, `─────────────`, ``, descText] : []),
          ].join('\n')
        : [
            `【キャンセル待ち登録】`,
            ``,
            `${event.title}`,
            ``,
            `📅 ${dateStr}`,
            `📍 ${event.location}`,
            ``,
            `キャンセル待ち ${waitlistOrder} 番目に登録されました。`,
          ].join('\n');
      // 参加者向け（Talkに表示される予約詳細）
      await this.prisma.adminMemberMessage.create({
        data: { tenantId, memberId: member.id, content: talkContent, fromAdmin: true },
      });
      // 管理者向けバッジ用（システム通知・LIFF側には非表示）
      const adminNotifContent = status === 'reserved'
        ? `✅ ${member.lineDisplayName ?? member.name ?? '参加者'}が「${event.title}」を予約しました`
        : `⏳ ${member.lineDisplayName ?? member.name ?? '参加者'}が「${event.title}」キャンセル待ち${waitlistOrder}番目に登録しました`;
      await this.prisma.adminMemberMessage.create({
        data: { tenantId, memberId: member.id, content: adminNotifContent, fromAdmin: false, isSystem: true },
      });
    }

    return { id: reservation.id, status, waitlistOrder, stripeCheckoutUrl };
  }

  // 自分の予約を確認（lineUserId で検索）
  async getMyReservation(tenantId: string, eventId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) return null;

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        eventId,
        memberId: member.id,
        status: { in: ['reserved', 'waitlisted', 'waiting_payment'] },
      },
      orderBy: { reservedAt: 'desc' },
    });
    return reservation;
  }

  private async ensureEventExists(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');
  }

  // ---- 繋がり / チャット ----

  async getProfile(tenantId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) throw new NotFoundException('プロフィールが見つかりません。先にイベントに予約してください。');
    return {
      id: member.id,
      name: member.name,
      grade: member.grade,
      gender: member.gender,
      showEventsToConnections: member.showEventsToConnections,
    };
  }

  async updateProfile(tenantId: string, lineUserId: string, data: { name: string; grade: string; gender: string }) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) throw new NotFoundException('プロフィールが見つかりません');
    const updated = await this.prisma.member.update({
      where: { id: member.id },
      data: { name: data.name, grade: data.grade, gender: data.gender },
    });
    return { id: updated.id, name: updated.name, grade: updated.grade, gender: updated.gender, showEventsToConnections: updated.showEventsToConnections };
  }

  async updateSettings(tenantId: string, lineUserId: string, showEventsToConnections: boolean) {
    const member = await this.prisma.member.update({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
      data: { showEventsToConnections },
    });
    return { showEventsToConnections: member.showEventsToConnections };
  }

  async getMemberProfile(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new NotFoundException('メンバーが見つかりません');
    return { id: member.id, name: member.name, grade: member.grade, gender: member.gender };
  }

  async createConnection(tenantId: string, myLineUserId: string, targetMemberId: string) {
    const me = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId: myLineUserId } },
    });
    if (!me) throw new NotFoundException('自分のプロフィールが見つかりません');
    if (me.id === targetMemberId) throw new BadRequestException('自分自身と繋がることはできません');

    const target = await this.prisma.member.findFirst({ where: { id: targetMemberId, tenantId } });
    if (!target) throw new NotFoundException('相手が見つかりません');

    const [m1, m2] = [me.id, targetMemberId].sort();
    const existing = await this.prisma.connection.findUnique({
      where: { member1Id_member2Id: { member1Id: m1, member2Id: m2 } },
    });
    if (existing) return { ...existing, alreadyConnected: true };

    const conn = await this.prisma.connection.create({
      data: { tenantId, member1Id: m1, member2Id: m2 },
    });
    return { ...conn, alreadyConnected: false };
  }

  async getConnections(tenantId: string, lineUserId: string) {
    const me = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!me) return [];

    const conns = await this.prisma.connection.findMany({
      where: { tenantId, OR: [{ member1Id: me.id }, { member2Id: me.id }] },
      include: {
        member1: { select: { id: true, name: true, grade: true } },
        member2: { select: { id: true, name: true, grade: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return conns.map((c) => {
      const partner = c.member1Id === me.id ? c.member2 : c.member1;
      const last = c.messages[0];
      return {
        id: c.id,
        partner,
        lastMessage: last ? { content: last.content, createdAt: last.createdAt } : null,
        createdAt: c.createdAt,
      };
    });
  }

  async getMessages(tenantId: string, connectionId: string, lineUserId: string) {
    const me = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!me) throw new NotFoundException('メンバーが見つかりません');

    const conn = await this.prisma.connection.findFirst({
      where: { id: connectionId, tenantId, OR: [{ member1Id: me.id }, { member2Id: me.id }] },
      include: {
        member1: { select: { id: true, name: true } },
        member2: { select: { id: true, name: true } },
      },
    });
    if (!conn) throw new NotFoundException('会話が見つかりません');

    const partner = conn.member1Id === me.id ? conn.member2 : conn.member1;

    const messages = await this.prisma.message.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      myMemberId: me.id,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        createdAt: m.createdAt,
      })),
    };
  }

  async sendMessage(tenantId: string, connectionId: string, lineUserId: string, content: string) {
    const me = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!me) throw new NotFoundException('メンバーが見つかりません');

    const conn = await this.prisma.connection.findFirst({
      where: { id: connectionId, tenantId, OR: [{ member1Id: me.id }, { member2Id: me.id }] },
      include: {
        member1: { select: { id: true, lineUserId: true } },
        member2: { select: { id: true, lineUserId: true } },
      },
    });
    if (!conn) throw new NotFoundException('会話が見つかりません');

    const message = await this.prisma.message.create({
      data: { connectionId, senderId: me.id, content },
    });

    // 相手にLINEプッシュ通知
    const partner = conn.member1Id === me.id ? conn.member2 : conn.member1;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (partner.lineUserId) {
      await this.lineMessaging.sendTalkNotification(
        tenant?.lineChannelAccessToken ?? '',
        partner.lineUserId,
        me.name ?? 'メンバー',
        content,
      );
    }

    return message;
  }

  // キャンセル（キャンセル待ちの自動繰り上げ込み）
  async cancelReservation(tenantId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      include: { event: true, member: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.cancelled },
    });

    // 定員がある場合のみ繰り上げ処理
    if (reservation.event.capacity !== null) {
      const activeCount = await this.prisma.reservation.count({
        where: { eventId: reservation.eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
      });

      if (activeCount < reservation.event.capacity) {
        const next = await this.prisma.reservation.findFirst({
          where: { eventId: reservation.eventId, status: 'waitlisted' },
          orderBy: { waitlistOrder: 'asc' },
          include: { member: true },
        });

        if (next) {
          await this.prisma.reservation.update({
            where: { id: next.id },
            data: { status: ReservationStatus.reserved, waitlistOrder: null },
          });

          const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
          if (tenant?.lineChannelAccessToken) {
            await this.lineMessaging.sendWaitlistPromoted(
              tenant.lineChannelAccessToken, next.member.lineUserId,
              reservation.event.title, reservation.event.heldAt, reservation.event.location,
            );
          }
        }
      }
    }

    // 主催者へのキャンセル通知
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.lineChannelAccessToken && tenant.organizerLineUserId) {
      await this.lineMessaging.sendCancelNotifyToOrganizer(
        tenant.lineChannelAccessToken,
        tenant.organizerLineUserId,
        reservation.member.name ?? '（名前未登録）',
        reservation.event.title,
      );
    }

    return { message: 'キャンセルしました' };
  }

  async getNotifications(tenantId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) return [];

    return this.prisma.notification.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(tenantId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId },
      data: { read: true },
    });
  }

  async markAllNotificationsRead(tenantId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) return;
    return this.prisma.notification.updateMany({
      where: { memberId: member.id, read: false },
      data: { read: true },
    });
  }

  // 管理者↔メンバー トーク（メンバー側）
  async getAdminMessages(tenantId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) return [];
    return this.prisma.adminMemberMessage.findMany({
      where: { memberId: member.id, tenantId, isSystem: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAdminMessagesRead(tenantId: string, lineUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) return;
    await this.prisma.adminMemberMessage.updateMany({
      where: { memberId: member.id, tenantId, fromAdmin: true, read: false },
      data: { read: true },
    });
  }

  async sendToAdmin(tenantId: string, lineUserId: string, content: string) {
    let member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
    if (!member) {
      member = await this.prisma.member.create({
        data: { tenantId, lineUserId },
      });
    }
    const message = await this.prisma.adminMemberMessage.create({
      data: { tenantId, memberId: member.id, content, fromAdmin: false },
    });
    return message;
  }

  // サポートメッセージ（ユーザー↔COMIU）
  async getSupportMessages(lineUserId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { lineUserId, fromUser: false, read: false },
      data: { read: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendSupportMessage(lineUserId: string, tenantId: string, content: string) {
    return this.prisma.supportMessage.create({
      data: { lineUserId, tenantId, content, fromUser: true },
    });
  }
}
