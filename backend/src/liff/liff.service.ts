import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';
import { StripeService } from '../stripe/stripe.service';
import { PLAN_LIMITS } from '../config/plan-limits';
export class CreateReservationDto {
  @IsString() eventId!: string;
  @IsOptional() @IsString() lineUserId?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() lineDisplayName?: string;
  @IsOptional() @IsString() linePictureUrl?: string;
}

export class SubmitReviewDto {
  @IsOptional() @IsString() lineUserId?: string;
  @IsString() @MaxLength(2000) content!: string;
}

export class SendMessageDto {
  @IsString() @MaxLength(10000) content!: string;
}

@Injectable()
export class LiffService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
    private stripeService: StripeService,
  ) {}

  private async resolveTenantId(codeOrId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: codeOrId }, { code: codeOrId }],
        deletedAt: null,
        bannedAt: null,
      },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('テナントが見つかりません');
    return tenant.id;
  }

  async recordAccess(tenantId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    await this.prisma.tenantLiffAccess.create({ data: { tenantId } });
    return { ok: true };
  }

  // テナント公開情報（認証不要）
  async getTenantInfo(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { code: tenantId }],
        deletedAt: null,
        bannedAt: null,
      },
    });
    if (!tenant) throw new NotFoundException('テナントが見つかりません');
    return {
      id: tenant.id,
      name: tenant.name,
      description: tenant.description,
      lineDisplayName: tenant.lineDisplayName,
      linePictureUrl: tenant.linePictureUrl,
      iconUrl: tenant.iconUrl,
      lineChannelId: tenant.lineChannelId,
      liffEventView: tenant.liffEventView,
      themeColor: tenant.themeColor,
    };
  }

  // イベント一覧（status=open のものだけ）
  async getEvents(tenantId: string, lineUserId?: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const events = await this.prisma.event.findMany({
      where: {
        tenantId,
        status: 'open',
        heldAt: { gte: new Date() },
      },
      include: {
        reservations: {
          where: {
            status: { in: ['reserved', 'attended', 'waiting_payment'] },
          },
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
      endAt: this.publicEndAt(e.heldAt, e.endAt),
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

    const me = await this.findMember(tenantId, lineUserId);
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
    tenantId = await this.resolveTenantId(tenantId);
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const reservedCount = await this.prisma.reservation.count({
      where: {
        eventId,
        status: { in: ['reserved', 'attended', 'waiting_payment'] },
      },
    });

    const reviews = await this.getPublishedReviews(tenantId, eventId);

    return {
      ...event,
      endAt: this.publicEndAt(event.heldAt, event.endAt),
      reservedCount,
      reviews,
    };
  }

  async getPublishedReviews(tenantId: string, eventId: string) {
    tenantId = await this.resolveTenantId(tenantId);
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
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return null;

    return this.prisma.eventReview.findUnique({
      where: { eventId_memberId: { eventId, memberId: member.id } },
    });
  }

  async submitReview(tenantId: string, eventId: string, dto: SubmitReviewDto) {
    tenantId = await this.resolveTenantId(tenantId);
    if (!dto.lineUserId) {
      throw new UnauthorizedException('LIFF認証が必要です');
    }
    const content = dto.content.trim();
    if (content.length < 5 || content.length > 300) {
      throw new BadRequestException(
        '感想は5文字以上300文字以内で入力してください',
      );
    }

    await this.ensureEventExists(tenantId, eventId);

    const member = await this.findMember(tenantId, dto.lineUserId);
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
      throw new ForbiddenException(
        '予約済みまたは参加済みのイベントにのみ感想を投稿できます',
      );
    }

    return this.prisma.eventReview.upsert({
      where: { eventId_memberId: { eventId, memberId: member.id } },
      create: {
        tenantId,
        eventId,
        memberId: member.id,
        content,
        isPublished: false,
      },
      update: { content, isPublished: false },
    });
  }

  // 予約登録（重複チェック・キャンセル待ち・LINE通知込み）
  async createReservation(tenantId: string, dto: CreateReservationDto) {
    tenantId = await this.resolveTenantId(tenantId);
    if (!dto.lineUserId) {
      throw new UnauthorizedException('LIFF認証が必要です');
    }
    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, tenantId },
    });
    if (!event) throw new NotFoundException('イベントが見つかりません');
    if (event.status !== 'open') {
      throw new BadRequestException('このイベントは現在予約できません');
    }
    if (event.heldAt.getTime() < Date.now()) {
      throw new BadRequestException('このイベントの受付は終了しました');
    }

    // グローバルBAN チェック
    const globalBan = await this.prisma.bannedLineUser.findUnique({
      where: { lineUserId: dto.lineUserId },
    });
    if (globalBan)
      throw new ForbiddenException('このアカウントは利用できません');

    // フリープラン：参加者50人上限チェック
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (tenant?.plan === 'free') {
      const memberCount = await this.prisma.member.count({
        where: { tenantId },
      });
      if (memberCount >= PLAN_LIMITS.free.members) {
        throw new ForbiddenException(
          `参加者数の上限（${PLAN_LIMITS.free.members}人）に達しました。スタンダードプランにアップグレードしてください。`,
        );
      }
    }

    // 参加者を登録 or 情報更新（LINEユーザーIDで一意に管理）
    let member = await this.findMember(tenantId, dto.lineUserId);

    const lineProfile = await this.lineMessaging.getLineProfile(
      tenant?.lineChannelAccessToken ?? '',
      dto.lineUserId,
    );

    // DTO values (from LIFF SDK) take priority over Messaging API profile
    const resolvedDisplayName =
      dto.lineDisplayName ?? lineProfile?.displayName ?? null;
    const resolvedPictureUrl =
      dto.linePictureUrl ?? lineProfile?.pictureUrl ?? null;

    if (!member) {
      if (!dto.name || !dto.grade || !dto.gender) {
        throw new BadRequestException(
          '初回予約時はお名前・学年・性別を入力してください',
        );
      }
      member = await this.prisma.member.create({
        data: {
          tenantId,
          lineUserId: dto.lineUserId,
          name: dto.name,
          grade: dto.grade,
          gender: dto.gender,
          ...(resolvedDisplayName && { lineDisplayName: resolvedDisplayName }),
          ...(resolvedPictureUrl && { linePictureUrl: resolvedPictureUrl }),
        },
      });
    } else {
      member = await this.prisma.member.update({
        where: { id: member.id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.grade && { grade: dto.grade }),
          ...(dto.gender && { gender: dto.gender }),
          ...(resolvedDisplayName && { lineDisplayName: resolvedDisplayName }),
          ...(resolvedPictureUrl && { linePictureUrl: resolvedPictureUrl }),
        },
      });
    }

    // テナントブロックチェック
    if (member.blockedAt)
      throw new ForbiddenException('この団体から利用制限されています');

    // 同じイベントへの重複予約チェック
    const existingCount = await this.prisma.reservation.count({
      where: {
        memberId: member.id,
        eventId: dto.eventId,
        status: { not: 'cancelled' },
      },
    });
    if (existingCount >= 1) {
      throw new ConflictException('このイベントはすでに予約済みです');
    }

    // 同じ日の別イベントへの予約チェック（JST基準）
    const jstOffset = 9 * 60 * 60 * 1000;
    const eventDateJST = new Date(event.heldAt.getTime() + jstOffset);
    const dayStart = new Date(
      Date.UTC(
        eventDateJST.getUTCFullYear(),
        eventDateJST.getUTCMonth(),
        eventDateJST.getUTCDate(),
      ) - jstOffset,
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const sameDayReservation = await this.prisma.reservation.findFirst({
      where: {
        memberId: member.id,
        tenantId,
        eventId: { not: dto.eventId },
        status: {
          in: ['reserved', 'attended', 'waiting_payment', 'waitlisted'],
        },
        event: { heldAt: { gte: dayStart, lt: dayEnd } },
      },
    });
    if (sameDayReservation) {
      throw new ConflictException(
        '同じ日に別のイベントへの予約があるため、予約できません',
      );
    }

    // 定員チェック
    const reservedCount = await this.prisma.reservation.count({
      where: {
        eventId: dto.eventId,
        status: { in: ['reserved', 'attended', 'waiting_payment'] },
      },
    });
    const isFull = event.capacity !== null && reservedCount >= event.capacity;

    // 前払い必須のイベントは満席なら予約不可
    if (isFull && event.paymentRequired) {
      throw new BadRequestException('満席のため予約できません');
    }

    const effectivePrice =
      event.priceMale != null && event.priceFemale != null
        ? member.gender === '男性'
          ? event.priceMale
          : member.gender === '女性'
            ? event.priceFemale
            : Math.max(event.priceMale, event.priceFemale)
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
      data: {
        tenantId,
        eventId: dto.eventId,
        memberId: member.id,
        status,
        waitlistOrder,
      },
    });

    // Stripe 決済セッション作成
    let stripeCheckoutUrl: string | undefined;
    if (status === 'waiting_payment') {
      if (tenant?.stripeSecretKey) {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const session = await this.stripeService.createCheckoutSession(
          tenant.stripeSecretKey,
          {
            eventTitle: event.title,
            price: effectivePrice,
            reservationId: reservation.id,
            tenantId,
            successUrl: `${frontendUrl}/liff/${tenantId}`,
            cancelUrl: `${frontendUrl}/liff/${tenantId}/events/${event.id}/reserve`,
          },
        );
        stripeCheckoutUrl = session.url ?? undefined;
        await this.prisma.reservation.update({
          where: { id: reservation.id },
          data: { stripePaymentIntentId: session.id },
        });
      }
    }

    // LINE通知
    if (event.notifyOnReserve && status !== 'waiting_payment') {
      const token = tenant?.lineChannelAccessToken ?? '';
      if (status === 'reserved') {
        await this.lineMessaging.sendReservationConfirm(
          token,
          dto.lineUserId,
          event.title,
          event.heldAt,
          event.location,
          event.price,
          event.description,
        );
      } else {
        await this.lineMessaging.sendWaitlistRegistered(
          token,
          dto.lineUserId,
          event.title,
          waitlistOrder!,
        );
      }
    }

    // TALKに予約詳細を送信
    if (event.notifyOnReserveApp && status !== 'waiting_payment') {
      const dateStr = new Date(event.heldAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const descText = event.description
        ? event.description.slice(0, 300) +
          (event.description.length > 300 ? '…' : '')
        : '';

      // TALK（詳細・適切な改行）
      const talkContent =
        status === 'reserved'
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
        data: {
          tenantId,
          memberId: member.id,
          content: talkContent,
          fromAdmin: true,
        },
      });
      // 管理者向けバッジ用（システム通知・LIFF側には非表示）
      const adminNotifContent =
        status === 'reserved'
          ? `✅ ${member.lineDisplayName ?? member.name ?? '参加者'}が「${event.title}」を予約しました`
          : `⏳ ${member.lineDisplayName ?? member.name ?? '参加者'}が「${event.title}」キャンセル待ち${waitlistOrder}番目に登録しました`;
      await this.prisma.adminMemberMessage.create({
        data: {
          tenantId,
          memberId: member.id,
          content: adminNotifContent,
          fromAdmin: false,
          isSystem: true,
        },
      });
    }

    return { id: reservation.id, status, waitlistOrder, stripeCheckoutUrl };
  }

  // 自分の予約を確認（lineUserId で検索）
  async getMyReservation(
    tenantId: string,
    eventId: string,
    lineUserId: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
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

  private publicEndAt(heldAt: Date, endAt: Date | null) {
    if (!endAt || endAt <= heldAt) return null;
    return endAt;
  }

  private async findMember(tenantId: string, lineUserId: string) {
    return this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
    });
  }

  // ---- 繋がり / チャット ----

  async joinTenant(
    tenantId: string,
    lineUserId: string,
    lineDisplayName?: string,
    linePictureUrl?: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
      create: {
        tenantId,
        lineUserId,
        lineDisplayName: lineDisplayName ?? null,
        linePictureUrl: linePictureUrl ?? null,
      },
      update: {
        ...(lineDisplayName && { lineDisplayName }),
        ...(linePictureUrl && { linePictureUrl }),
      },
    });
    return {
      id: member.id,
      name: member.name,
      grade: member.grade,
      gender: member.gender,
      showEventsToConnections: member.showEventsToConnections,
    };
  }

  async getProfile(tenantId: string, lineUserId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) throw new NotFoundException('プロフィールが見つかりません');
    return {
      id: member.id,
      name: member.name,
      grade: member.grade,
      gender: member.gender,
      showEventsToConnections: member.showEventsToConnections,
    };
  }

  async updateProfile(
    tenantId: string,
    lineUserId: string,
    data: { name: string; grade: string; gender: string },
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) throw new NotFoundException('プロフィールが見つかりません');
    const updated = await this.prisma.member.update({
      where: { id: member.id },
      data: { name: data.name, grade: data.grade, gender: data.gender },
    });
    return {
      id: updated.id,
      name: updated.name,
      grade: updated.grade,
      gender: updated.gender,
      showEventsToConnections: updated.showEventsToConnections,
    };
  }

  async syncLineProfile(
    tenantId: string,
    lineUserId: string,
    data: { lineDisplayName?: string; linePictureUrl?: string },
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.prisma.member.findFirst({
      where: { tenantId, lineUserId },
    });
    if (!member) return;
    await this.prisma.member.update({
      where: { id: member.id },
      data: {
        ...(data.lineDisplayName && { lineDisplayName: data.lineDisplayName }),
        ...(data.linePictureUrl && { linePictureUrl: data.linePictureUrl }),
      },
    });
  }

  async updateSettings(
    tenantId: string,
    lineUserId: string,
    showEventsToConnections: boolean,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.prisma.member.update({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
      data: { showEventsToConnections },
    });
    return { showEventsToConnections: member.showEventsToConnections };
  }

  async getMemberProfile(tenantId: string, memberId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) throw new NotFoundException('メンバーが見つかりません');
    return {
      id: member.id,
      name: member.name,
      grade: member.grade,
      gender: member.gender,
    };
  }

  async createConnection(
    tenantId: string,
    myLineUserId: string,
    targetMemberId: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const me = await this.findMember(tenantId, myLineUserId);
    if (!me) throw new NotFoundException('自分のプロフィールが見つかりません');
    if (me.id === targetMemberId)
      throw new BadRequestException('自分自身と繋がることはできません');

    const target = await this.prisma.member.findFirst({
      where: { id: targetMemberId, tenantId },
    });
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
    tenantId = await this.resolveTenantId(tenantId);
    const me = await this.findMember(tenantId, lineUserId);
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
        lastMessage: last
          ? { content: last.content, createdAt: last.createdAt }
          : null,
        createdAt: c.createdAt,
      };
    });
  }

  async getMessages(
    tenantId: string,
    connectionId: string,
    lineUserId: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const me = await this.findMember(tenantId, lineUserId);
    if (!me) throw new NotFoundException('メンバーが見つかりません');

    const conn = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        OR: [{ member1Id: me.id }, { member2Id: me.id }],
      },
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

  async sendMessage(
    tenantId: string,
    connectionId: string,
    lineUserId: string,
    content: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const me = await this.findMember(tenantId, lineUserId);
    if (!me) throw new NotFoundException('メンバーが見つかりません');

    const conn = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        OR: [{ member1Id: me.id }, { member2Id: me.id }],
      },
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
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
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
  async cancelReservation(
    tenantId: string,
    reservationId: string,
    lineUserId: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      include: { event: true, member: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.member.lineUserId !== lineUserId) {
      throw new ForbiddenException('この予約をキャンセルする権限がありません');
    }

    const cancellable: ReservationStatus[] = [
      ReservationStatus.reserved,
      ReservationStatus.waitlisted,
      ReservationStatus.waiting_payment,
    ];
    if (!cancellable.includes(reservation.status)) {
      throw new BadRequestException('この予約はキャンセルできません');
    }

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.cancelled },
    });

    // 定員がある場合のみ繰り上げ処理
    if (reservation.event.capacity !== null) {
      const activeCount = await this.prisma.reservation.count({
        where: {
          eventId: reservation.eventId,
          status: { in: ['reserved', 'attended', 'waiting_payment'] },
        },
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

          const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
          });
          if (tenant?.lineChannelAccessToken) {
            await this.lineMessaging.sendWaitlistPromoted(
              tenant.lineChannelAccessToken,
              next.member.lineUserId,
              reservation.event.title,
              reservation.event.heldAt,
              reservation.event.location,
            );
          }
        }
      }
    }

    // 主催者へのキャンセル通知
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
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
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return [];

    return this.prisma.notification.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(
    tenantId: string,
    notificationId: string,
    lineUserId: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return;
    return this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId, memberId: member.id },
      data: { read: true },
    });
  }

  async markAllNotificationsRead(tenantId: string, lineUserId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return;
    return this.prisma.notification.updateMany({
      where: { memberId: member.id, read: false },
      data: { read: true },
    });
  }

  // 管理者↔メンバー トーク（メンバー側）
  async getAdminMessages(tenantId: string, lineUserId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return [];
    return this.prisma.adminMemberMessage.findMany({
      where: { memberId: member.id, tenantId, isSystem: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAdminMessagesRead(tenantId: string, lineUserId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return;
    await this.prisma.adminMemberMessage.updateMany({
      where: { memberId: member.id, tenantId, fromAdmin: true, read: false },
      data: { read: true },
    });
  }

  async sendToAdmin(tenantId: string, lineUserId: string, content: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) throw new ForbiddenException('メンバー登録が必要です');
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

  async sendSupportMessage(
    lineUserId: string,
    tenantId: string,
    content: string,
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    return this.prisma.supportMessage.create({
      data: { lineUserId, tenantId, content, fromUser: true },
    });
  }
}
