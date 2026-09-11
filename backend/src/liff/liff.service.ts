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
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() @MaxLength(200) comment?: string;
  @IsOptional() customAnswers?: Record<string, string>;
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
      include: {
        publicPages: { take: 1, select: { footerText: true } },
      },
    });
    if (!tenant) throw new NotFoundException('テナントが見つかりません');
    const reserveSettings = this.parseReserveSettings(
      tenant.publicPages[0]?.footerText,
    );
    return {
      id: tenant.id,
      name: tenant.name,
      description: tenant.description,
      tags: tenant.tags,
      typeTags: tenant.typeTags,
      activityTags: tenant.activityTags,
      lineDisplayName: tenant.lineDisplayName,
      linePictureUrl: tenant.linePictureUrl,
      iconUrl: tenant.iconUrl,
      lineChannelId: tenant.lineChannelId,
      liffId: tenant.liffId,
      liffEventView: tenant.liffEventView,
      themeColor: tenant.themeColor,
      activityTickerEnabled: tenant.activityTickerEnabled,
      requireName: tenant.requireName,
      requireGrade: tenant.requireGrade,
      requireGender: tenant.requireGender,
      showLevel: tenant.showLevel,
      showComment: tenant.showComment,
      customProfileQuestions: tenant.customProfileQuestions,
      ...reserveSettings,
    };
  }

  private parseReserveSettings(footerText?: string | null) {
    try {
      const parsed = JSON.parse(footerText ?? '{}');
      const reserveLineUrl =
        typeof parsed.reserveLineUrl === 'string' &&
        parsed.reserveLineUrl.trim()
          ? parsed.reserveLineUrl.trim()
          : typeof parsed.line === 'string' && parsed.line.trim()
            ? parsed.line.trim()
            : null;
      // 公開サイトの「お問い合わせ」リンク。contactUrlが現行フィールド名だが、
      // リネーム前のcontactキーで保存された既存データも読めるようにする。
      const contactUrl =
        typeof parsed.contactUrl === 'string' && parsed.contactUrl.trim()
          ? parsed.contactUrl.trim()
          : typeof parsed.contact === 'string' && parsed.contact.trim()
            ? parsed.contact.trim()
            : null;
      return {
        reserveActionStyle:
          typeof parsed.reserveActionStyle === 'string'
            ? parsed.reserveActionStyle
            : null,
        reserveLineUrl,
        contactUrl,
      };
    } catch {
      return {
        reserveActionStyle: null,
        reserveLineUrl: null,
        contactUrl: null,
      };
    }
  }

  // イベント一覧（status=open のものだけ）
  async getEvents(tenantId: string) {
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

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      descriptionMale: e.descriptionMale,
      descriptionFemale: e.descriptionFemale,
      heldAt: e.heldAt,
      endAt: this.publicEndAt(e.heldAt, e.endAt),
      location: e.location,
      locationHint: e.locationHint,
      capacity: e.capacity,
      status: e.status,
      price: e.price,
      priceMale: e.priceMale,
      priceFemale: e.priceFemale,
      paymentRequired: e.paymentRequired,
      reservedCount: e.reservations.length,
      imageUrl: e.imageUrl,
      iconUrl: e.iconUrl,
      category: e.category,
      levelEnabled: e.levelEnabled,
    }));
  }

  // ヘッダー下に流す「最近のログイン・予約」テロップ用
  async getRecentActivity(tenantId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const [reservations, newMembers] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { tenantId, status: { in: ['reserved', 'attended'] } },
        orderBy: { reservedAt: 'desc' },
        take: 15,
        select: {
          id: true,
          reservedAt: true,
          member: { select: { name: true, lineDisplayName: true, linePictureUrl: true } },
        },
      }),
      this.prisma.member.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, createdAt: true, name: true, lineDisplayName: true, linePictureUrl: true },
      }),
    ]);

    const items = [
      ...reservations.map((r) => ({
        id: `r-${r.id}`,
        type: 'reservation' as const,
        at: r.reservedAt,
        name: r.member.lineDisplayName ?? r.member.name ?? '参加者',
        pictureUrl: r.member.linePictureUrl,
      })),
      ...newMembers.map((m) => ({
        id: `l-${m.id}`,
        type: 'login' as const,
        at: m.createdAt,
        name: m.lineDisplayName ?? m.name ?? '参加者',
        pictureUrl: m.linePictureUrl,
      })),
    ];

    return items
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 15);
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

    return {
      ...event,
      endAt: this.publicEndAt(event.heldAt, event.endAt),
      reservedCount,
    };
  }

  // 特定のイベントに紐づかない、団体全体への口コミ。予約・参加の有無を問わず、
  // LINE認証済みのメンバーなら誰でも投稿できる。
  async getMyTenantReview(tenantId: string, lineUserId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return null;
    return this.prisma.tenantReview.findUnique({
      where: { tenantId_memberId: { tenantId, memberId: member.id } },
    });
  }

  // 公開済みの団体全体の口コミ一覧（公開サイトの口コミセクションと同じ内容）。
  async getPublishedTenantReviews(tenantId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const reviews = await this.prisma.tenantReview.findMany({
      where: { tenantId, isPublished: true },
      include: { member: { select: { name: true, lineDisplayName: true, linePictureUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return reviews.map((review) => ({
      id: review.id,
      content: review.content,
      createdAt: review.createdAt,
      authorName: review.member.name ?? review.member.lineDisplayName ?? '参加者',
      authorIconUrl: review.member.linePictureUrl,
    }));
  }

  async submitTenantReview(tenantId: string, dto: SubmitReviewDto) {
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

    // 予約・参加の有無を問わず投稿できる仕様のため、まだメンバー登録が無い
    // （プロフィール未入力・未予約）LINEユーザーの場合は、ここで最小限の
    // メンバーを作成する（エラーにしない）。
    let member = await this.findMember(tenantId, dto.lineUserId);
    if (!member) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      const lineProfile = await this.lineMessaging
        .getLineProfile(tenant?.lineChannelAccessToken ?? '', dto.lineUserId)
        .catch(() => null);
      member = await this.prisma.member.create({
        data: {
          tenantId,
          lineUserId: dto.lineUserId,
          ...(lineProfile?.displayName && {
            lineDisplayName: lineProfile.displayName,
          }),
          ...(lineProfile?.pictureUrl && {
            linePictureUrl: lineProfile.pictureUrl,
          }),
        },
      });
    }

    const existing = await this.prisma.tenantReview.findUnique({
      where: { tenantId_memberId: { tenantId, memberId: member.id } },
    });
    if (existing) {
      throw new ConflictException('すでに感想を投稿済みです。投稿内容は変更できません。');
    }

    return this.prisma.tenantReview.create({
      data: {
        tenantId,
        memberId: member.id,
        content,
        isPublished: false,
      },
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
      const requiresLevel = event.levelEnabled;
      // 団体ごとの設定で必須にしていない項目は、未入力でも予約できる。
      const missingFields: string[] = [];
      if (tenant?.requireName !== false && !dto.name) missingFields.push('お名前');
      if (tenant?.requireGrade !== false && !dto.grade) missingFields.push('年齢');
      if (tenant?.requireGender !== false && !dto.gender) missingFields.push('性別');
      if (requiresLevel && !dto.level) missingFields.push('レベル');
      if (missingFields.length > 0) {
        throw new BadRequestException(
          `初回予約時は${missingFields.join('・')}を入力してください`,
        );
      }
      member = await this.prisma.member.create({
        data: {
          tenantId,
          lineUserId: dto.lineUserId,
          ...(dto.name && { name: dto.name }),
          ...(dto.grade && { grade: dto.grade }),
          ...(dto.gender && { gender: dto.gender }),
          ...(dto.level && { level: dto.level }),
          ...(dto.comment !== undefined && { comment: dto.comment }),
          ...(dto.customAnswers && { customAnswers: dto.customAnswers }),
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
          ...(dto.level && { level: dto.level }),
          ...(dto.comment !== undefined && { comment: dto.comment }),
          ...(dto.customAnswers && { customAnswers: dto.customAnswers }),
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

    if (status === 'waiting_payment' && !tenant?.stripeSecretKey) {
      throw new BadRequestException('Stripe payment is not configured');
    }

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
        try {
          const session = await this.stripeService.createCheckoutSession(
            tenant.stripeSecretKey,
            {
              eventTitle: event.title,
              price: effectivePrice,
              reservationId: reservation.id,
              tenantId,
              successUrl: `${frontendUrl}/liff/${tenantId}/profile`,
              cancelUrl: `${frontendUrl}/liff/${tenantId}/events/${event.id}/reserve`,
            },
          );
          stripeCheckoutUrl = session.url ?? undefined;
          if (!stripeCheckoutUrl) {
            throw new BadRequestException('Stripe checkout URL is unavailable');
          }
          await this.prisma.reservation.update({
            where: { id: reservation.id },
            data: { stripePaymentIntentId: session.id },
          });
        } catch (err) {
          await this.prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.cancelled },
          });
          throw err;
        }
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
          event.reservationMessageTemplate ?? tenant?.reservationMessageTemplate,
          {
            endAt: event.endAt,
            locationUrl: event.locationUrl,
            priceMale: event.priceMale,
            priceFemale: event.priceFemale,
            descriptionMale: event.descriptionMale,
            descriptionFemale: event.descriptionFemale,
            maleDelayMinutes: event.maleDelayMinutes,
            gender: member.gender,
          },
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

  // 自分の予約一覧（マイページ用）
  async getMyReservations(tenantId: string, lineUserId: string) {
    tenantId = await this.resolveTenantId(tenantId);
    const member = await this.findMember(tenantId, lineUserId);
    if (!member) return [];

    const reservations = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        memberId: member.id,
        status: { not: 'cancelled' },
      },
      include: { event: true },
      orderBy: { event: { heldAt: 'desc' } },
    });

    return reservations.map((r) => ({
      id: r.id,
      status: r.status,
      waitlistOrder: r.waitlistOrder,
      event: {
        id: r.event.id,
        title: r.event.title,
        heldAt: r.event.heldAt,
        endAt: this.publicEndAt(r.event.heldAt, r.event.endAt),
        location: r.event.location,
        locationHint: r.event.locationHint,
        price: r.event.price,
        priceMale: r.event.priceMale,
        priceFemale: r.event.priceFemale,
        description: r.event.description,
        descriptionMale: r.event.descriptionMale,
        descriptionFemale: r.event.descriptionFemale,
        category: r.event.category,
      },
    }));
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
      level: member.level,
      comment: member.comment,
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
      level: member.level,
      comment: member.comment,
      customAnswers: member.customAnswers,
    };
  }

  async updateProfile(
    tenantId: string,
    lineUserId: string,
    data: {
      name?: string;
      grade?: string;
      gender?: string;
      level?: string;
      comment?: string;
      customAnswers?: Record<string, string>;
    },
  ) {
    tenantId = await this.resolveTenantId(tenantId);
    const updated = await this.prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId } },
      create: {
        tenantId,
        lineUserId,
        name: data.name || null,
        grade: data.grade || null,
        gender: data.gender || null,
        level: data.level || null,
        comment: data.comment || null,
        ...(data.customAnswers && { customAnswers: data.customAnswers }),
      },
      update: {
        ...(data.name !== undefined && { name: data.name || null }),
        ...(data.grade !== undefined && { grade: data.grade || null }),
        ...(data.gender !== undefined && { gender: data.gender || null }),
        ...(data.level !== undefined && { level: data.level || null }),
        ...(data.comment !== undefined && { comment: data.comment || null }),
        ...(data.customAnswers && { customAnswers: data.customAnswers }),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      grade: updated.grade,
      gender: updated.gender,
      level: updated.level,
      comment: updated.comment,
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
