import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Stripe from 'stripe';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeEventSocialProofSettings } from '../event-social-proof/event-social-proof.service';

const TENANT_TYPE_TAGS = [
  'インカレサークル',
  '学生団体',
  'イベント団体',
  '社会人サークル',
];
const TENANT_ACTIVITY_TAGS = [
  '交流会',
  'バドミントン',
  'フットサル',
  'バスケ',
  'バレー',
  '卓球',
];

function normalizeAllowedTags(
  tags: string[] | undefined,
  allowedTags: string[],
  limit: number,
) {
  if (!tags) return [];
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => allowedTags.includes(tag))
    .slice(0, limit);
}

const MAX_CUSTOM_PROFILE_QUESTIONS = 10;
const MAX_CUSTOM_PROFILE_QUESTION_OPTIONS = 8;
const CUSTOM_PROFILE_QUESTION_TYPES: CustomProfileQuestionType[] = [
  'text',
  'radio',
  'checkbox',
  'select',
];

function sanitizeCustomProfileQuestions(
  questions: CustomProfileQuestionInput[] | undefined,
): {
  id: string;
  label: string;
  type: CustomProfileQuestionType;
  placeholder?: string;
  options?: string[];
  required: boolean;
}[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q, i) => {
      const options = Array.isArray(q.options)
        ? q.options
            .map((o) => (o ?? '').trim().slice(0, 50))
            .filter((o) => o.length > 0)
            .slice(0, MAX_CUSTOM_PROFILE_QUESTION_OPTIONS)
        : [];
      // 選択肢が2つ未満の選択式は成立しないので自由記述にフォールバックする。
      const type: CustomProfileQuestionType =
        CUSTOM_PROFILE_QUESTION_TYPES.includes(
          q.type as CustomProfileQuestionType,
        ) &&
        q.type !== 'text' &&
        options.length >= 2
          ? (q.type as CustomProfileQuestionType)
          : 'text';
      return {
        id: (q.id && q.id.trim()) || `q${Date.now()}_${i}`,
        label: (q.label ?? '').trim().slice(0, 100),
        type,
        required: !!q.required,
        ...(type === 'text' &&
          q.placeholder?.trim() && {
            placeholder: q.placeholder.trim().slice(0, 100),
          }),
        ...(type !== 'text' && { options }),
      };
    })
    .filter((q) => q.label.length > 0)
    .slice(0, MAX_CUSTOM_PROFILE_QUESTIONS);
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() reviewsSeoDescription?: string;
  @IsOptional() @IsString() eventsSeoDescription?: string;
  @IsOptional() @IsString() publicBlogUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) typeTags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) activityTags?: string[];
  @IsOptional() @IsString() lineChannelId?: string;
  @IsOptional() @IsString() lineChannelSecret?: string;
  @IsOptional() @IsString() lineChannelAccessToken?: string;
  @IsOptional() @IsString() liffId?: string;
  @IsOptional() @IsString() organizerLineUserId?: string;
  @IsOptional() @IsString() stripePublishableKey?: string;
  @IsOptional() @IsString() stripeSecretKey?: string;
  @IsOptional() @IsString() stripeWebhookSecret?: string;
  @IsOptional() @IsString() liffEventView?: string;
  @IsOptional() @IsString() reservationMessageTemplate?: string;
  @IsOptional() @IsString() reminderMessageTemplate?: string;
  @IsOptional() @IsBoolean() activityTickerEnabled?: boolean;
  @IsOptional() @IsObject() eventSocialProofSettings?: Record<string, unknown>;
  @IsOptional() @IsBoolean() requireName?: boolean;
  @IsOptional() @IsBoolean() requireGrade?: boolean;
  @IsOptional() @IsBoolean() requireGender?: boolean;
  @IsOptional() @IsBoolean() showLevel?: boolean;
  @IsOptional() @IsBoolean() showComment?: boolean;
  @IsOptional()
  @IsArray()
  customProfileQuestions?: CustomProfileQuestionInput[];
  @IsOptional() @IsString() themeColor?: string;
  @IsOptional() @IsString() iconUrl?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) referrerOptions?: string[];
}

export type CustomProfileQuestionType =
  | 'text'
  | 'radio'
  | 'checkbox'
  | 'select';

export interface CustomProfileQuestionInput {
  id?: string;
  label: string;
  type?: CustomProfileQuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private toSafeTenant<
    T extends {
      lineChannelId?: unknown;
      lineChannelSecret: unknown;
      lineChannelAccessToken: unknown;
      liffId?: unknown;
      stripeSecretKey: unknown;
      stripeWebhookSecret: unknown;
    },
  >(tenant: T) {
    // Keep secret values server-side while still letting the UI know whether setup is complete.

    const {
      lineChannelSecret: _lineChannelSecret,
      lineChannelAccessToken: _lineChannelAccessToken,
      stripeSecretKey: _stripeSecretKey,
      stripeWebhookSecret: _stripeWebhookSecret,
      ...safe
    } = tenant;
    return {
      ...safe,
      lineBasicConfigured: Boolean(safe.lineChannelId && _lineChannelSecret),
      lineChannelSecretConfigured: Boolean(_lineChannelSecret),
      lineChannelAccessTokenConfigured: Boolean(_lineChannelAccessToken),
      lineConfigured: Boolean(_lineChannelAccessToken),
    };
  }

  private async findRaw(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findOne(tenantId: string) {
    const tenant = await this.findRaw(tenantId);
    return this.toSafeTenant(tenant);
  }

  async toggleStaffView(tenantId: string, enabled: boolean) {
    const current = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { staffViewToken: true },
    });
    const staffViewToken =
      enabled && !current?.staffViewToken
        ? randomBytes(24).toString('base64url')
        : current?.staffViewToken;
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        staffViewEnabled: enabled,
        ...(staffViewToken && { staffViewToken }),
      },
    });
    return this.toSafeTenant(updated);
  }

  // 配布済みのリンクが漏れた場合に、新しいトークンへ差し替えて古いURLを無効化する。
  async regenerateStaffViewToken(tenantId: string) {
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        staffViewEnabled: true,
        staffViewToken: randomBytes(24).toString('base64url'),
      },
    });
    return this.toSafeTenant(updated);
  }

  private assertSensitiveSettingsReconfirmed(
    tenantId: string,
    accountId: string,
    dto: UpdateTenantDto,
    reauthRequired: boolean,
    reauthToken?: string,
  ) {
    const changesSensitiveLineSettings = [
      dto.lineChannelId,
      dto.lineChannelSecret,
      dto.lineChannelAccessToken,
      dto.liffId,
      dto.organizerLineUserId,
    ].some((value) => value !== undefined);

    if (!changesSensitiveLineSettings || !reauthRequired) return;
    if (!reauthToken)
      throw new UnauthorizedException('LINE設定を編集するには再認証が必要です');

    try {
      const payload = this.jwtService.verify<{
        tenantId: string;
        accountId: string;
        purpose?: string;
      }>(reauthToken);
      if (
        payload.tenantId !== tenantId ||
        payload.accountId !== accountId ||
        payload.purpose !== 'sensitive-settings'
      ) {
        throw new Error('invalid reauth token');
      }
    } catch {
      throw new UnauthorizedException(
        '再認証の有効期限が切れました。もう一度確認してください',
      );
    }
  }

  async update(
    tenantId: string,
    dto: UpdateTenantDto,
    accountId: string,
    reauthToken?: string,
  ) {
    const tenant = await this.findRaw(tenantId);

    if (dto.code !== undefined) {
      const slug = dto.code.trim().toLowerCase();
      if (
        slug &&
        !/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug) &&
        !/^[a-z0-9]{2,32}$/.test(slug)
      ) {
        throw new BadRequestException(
          'コードは英小文字・数字・ハイフンのみ使用できます（2〜32文字）',
        );
      }
      if (slug) {
        const conflict = await this.prisma.tenant.findFirst({
          where: { code: slug, NOT: { id: tenantId } },
        });
        if (conflict)
          throw new ConflictException('そのコードは既に使用されています');
      }
      dto = { ...dto, code: slug || undefined };
    }

    const changesLineSettings = [
      dto.lineChannelId,
      dto.lineChannelSecret,
      dto.lineChannelAccessToken,
      dto.liffId,
      dto.organizerLineUserId,
    ].some((v) => v !== undefined);
    const changesStripeSettings = [
      dto.stripePublishableKey,
      dto.stripeSecretKey,
      dto.stripeWebhookSecret,
    ].some((v) => v !== undefined);
    if (changesLineSettings && tenant.plan !== 'pro') {
      throw new ForbiddenException(
        'LINE API設定はPROプランでご利用いただけます。',
      );
    }
    if (changesStripeSettings && tenant.plan !== 'pro') {
      throw new ForbiddenException(
        'Stripe決済設定はPROプランでご利用いただけます。',
      );
    }

    this.assertSensitiveSettingsReconfirmed(
      tenantId,
      accountId,
      dto,
      Boolean(tenant.lineChannelAccessToken),
      reauthToken,
    );

    if (dto.requireGender === false) {
      const eventWithGenderDependency = await this.prisma.event.findFirst({
        where: {
          tenantId,
          OR: [
            { maleDelayMinutes: { not: null } },
            {
              AND: [
                { priceMale: { not: null } },
                { priceFemale: { not: null } },
              ],
            },
          ],
        },
      });
      if (eventWithGenderDependency) {
        throw new BadRequestException(
          '男女別の価格設定、または集合時間の性別別案内（男性の集合時間を遅らせる設定）を使っているイベントがあるため、性別の入力を必須なしにはできません。',
        );
      }
    }
    if (dto.showLevel === false) {
      const eventWithLevel = await this.prisma.event.findFirst({
        where: { tenantId, levelEnabled: true },
      });
      if (eventWithLevel) {
        throw new BadRequestException(
          'スポーツレベルを必須にしているイベントがあるため、レベル項目を非表示にはできません。',
        );
      }
    }

    const customProfileQuestions =
      dto.customProfileQuestions !== undefined
        ? sanitizeCustomProfileQuestions(dto.customProfileQuestions)
        : undefined;

    const typeTags =
      dto.typeTags !== undefined
        ? normalizeAllowedTags(dto.typeTags, TENANT_TYPE_TAGS, 10)
        : undefined;
    const activityTags =
      dto.activityTags !== undefined
        ? normalizeAllowedTags(dto.activityTags, TENANT_ACTIVITY_TAGS, 20)
        : undefined;
    const legacyTags =
      dto.tags !== undefined
        ? normalizeAllowedTags(dto.tags, TENANT_ACTIVITY_TAGS, 20)
        : undefined;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.reviewsSeoDescription !== undefined && {
          reviewsSeoDescription: dto.reviewsSeoDescription.trim() || null,
        }),
        ...(dto.eventsSeoDescription !== undefined && {
          eventsSeoDescription: dto.eventsSeoDescription.trim() || null,
        }),
        ...(dto.publicBlogUrl !== undefined && {
          publicBlogUrl: dto.publicBlogUrl || null,
        }),
        ...(legacyTags !== undefined && { tags: legacyTags }),
        ...(typeTags !== undefined && { typeTags }),
        ...(activityTags !== undefined && { activityTags, tags: activityTags }),
        ...(dto.lineChannelId !== undefined && {
          lineChannelId: dto.lineChannelId.trim() || null,
        }),
        ...(dto.lineChannelSecret !== undefined && {
          lineChannelSecret: dto.lineChannelSecret.trim() || null,
        }),
        ...(dto.lineChannelAccessToken !== undefined && {
          lineChannelAccessToken: dto.lineChannelAccessToken.trim() || null,
        }),
        ...(dto.liffId !== undefined && {
          liffId: dto.liffId.trim() || null,
        }),
        ...(dto.organizerLineUserId !== undefined && {
          organizerLineUserId: dto.organizerLineUserId || null,
        }),
        ...(dto.stripePublishableKey !== undefined && {
          stripePublishableKey: dto.stripePublishableKey || null,
        }),
        ...(dto.stripeSecretKey !== undefined && {
          stripeSecretKey: dto.stripeSecretKey || null,
        }),
        ...(dto.stripeWebhookSecret !== undefined && {
          stripeWebhookSecret: dto.stripeWebhookSecret || null,
        }),
        ...(dto.liffEventView !== undefined && {
          liffEventView: dto.liffEventView,
        }),
        ...(dto.reservationMessageTemplate !== undefined && {
          reservationMessageTemplate: dto.reservationMessageTemplate || null,
        }),
        ...(dto.reminderMessageTemplate !== undefined && {
          reminderMessageTemplate: dto.reminderMessageTemplate || null,
        }),
        ...(dto.activityTickerEnabled !== undefined && {
          activityTickerEnabled: dto.activityTickerEnabled,
        }),
        ...(dto.eventSocialProofSettings !== undefined && {
          eventSocialProofSettings: normalizeEventSocialProofSettings(
            dto.eventSocialProofSettings,
          ) as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.requireName !== undefined && { requireName: dto.requireName }),
        ...(dto.requireGrade !== undefined && {
          requireGrade: dto.requireGrade,
        }),
        ...(dto.requireGender !== undefined && {
          requireGender: dto.requireGender,
        }),
        ...(dto.showLevel !== undefined && { showLevel: dto.showLevel }),
        ...(dto.showComment !== undefined && { showComment: dto.showComment }),
        ...(customProfileQuestions !== undefined && {
          customProfileQuestions,
        }),
        ...(dto.themeColor !== undefined && { themeColor: dto.themeColor }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl || null }),
        ...(dto.code !== undefined && { code: dto.code || null }),
        ...(dto.referrerOptions !== undefined && {
          referrerOptions: [...new Set(dto.referrerOptions.map((s) => s.trim()).filter(Boolean))].slice(0, 50),
        }),
      },
    });
    return this.toSafeTenant(updated);
  }

  async getMemberCount(tenantId: string) {
    return this.prisma.member.count({ where: { tenantId } });
  }

  async listTenantReviews(tenantId: string) {
    return this.prisma.tenantReview.findMany({
      where: { tenantId },
      include: { member: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTenantReview(
    tenantId: string,
    reviewId: string,
    data: { isPublished?: boolean; content?: string },
  ) {
    const review = await this.prisma.tenantReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const content = data.content?.trim();
    if (content !== undefined && (content.length < 5 || content.length > 300)) {
      throw new BadRequestException(
        '感想は5文字以上300文字以内で入力してください',
      );
    }

    return this.prisma.tenantReview.update({
      where: { id: reviewId },
      data: {
        ...(data.isPublished !== undefined && {
          isPublished: data.isPublished,
        }),
        ...(content !== undefined && { content }),
      },
    });
  }

  async deleteTenantReview(tenantId: string, reviewId: string) {
    const review = await this.prisma.tenantReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.tenantReview.delete({ where: { id: reviewId } });
    return { success: true };
  }

  async getGrowthData(tenantId: string) {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getMonth() + 1}月`,
      };
    });

    const results = await Promise.all(
      months.map(async ({ year, month, label }) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        const [members, reservations] = await Promise.all([
          this.prisma.member.count({
            where: { tenantId, createdAt: { gte: start, lt: end } },
          }),
          this.prisma.reservation.count({
            where: {
              tenantId,
              reservedAt: { gte: start, lt: end },
              status: { notIn: ['cancelled'] },
            },
          }),
        ]);
        return { label, members, reservations };
      }),
    );
    return results;
  }

  async getActivityFeed(tenantId: string) {
    const [reservations, members] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { tenantId },
        orderBy: { reservedAt: 'desc' },
        take: 20,
        include: {
          member: { select: { name: true } },
          event: { select: { title: true, capacity: true } },
        },
      }),
      this.prisma.member.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { name: true, createdAt: true },
      }),
    ]);

    type Activity = { type: string; text: string; at: Date };
    const activities: Activity[] = [];

    for (const r of reservations) {
      const name = r.member.name ?? '匿名';
      const title = r.event.title;
      if (r.status === 'cancelled') {
        activities.push({
          type: 'cancel',
          text: `${name}さんが「${title}」をキャンセルしました`,
          at: r.reservedAt,
        });
      } else if (r.status === 'waitlisted') {
        activities.push({
          type: 'waitlist',
          text: `${name}さんの「${title}」の予約は満席のため未確定です`,
          at: r.reservedAt,
        });
      } else {
        activities.push({
          type: 'reserve',
          text: `${name}さんが「${title}」を予約しました`,
          at: r.reservedAt,
        });
      }
    }

    for (const m of members) {
      activities.push({
        type: 'member',
        text: `${m.name ?? '匿名'}さんが新規メンバーになりました`,
        at: m.createdAt,
      });
    }

    return activities
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 20)
      .map((a) => ({ ...a, at: a.at.toISOString() }));
  }

  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // JST基準の「今日」の範囲（サーバーはUTCで動いているため）。
    const jstOffset = 9 * 60 * 60 * 1000;
    const nowJst = new Date(now.getTime() + jstOffset);
    const todayStart = new Date(
      Date.UTC(
        nowJst.getUTCFullYear(),
        nowJst.getUTCMonth(),
        nowJst.getUTCDate(),
      ) - jstOffset,
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      memberCount,
      thisMonthEventCount,
      totalReservationCount,
      thisMonthReservationCount,
      paidReservations,
      todayAccessCount,
      todayReservationCount,
    ] = await Promise.all([
      this.prisma.member.count({ where: { tenantId } }),
      this.prisma.event.count({
        where: { tenantId, createdAt: { gte: monthStart } },
      }),
      this.prisma.reservation.count({
        where: { tenantId, status: { notIn: ['cancelled'] } },
      }),
      this.prisma.reservation.count({
        where: {
          tenantId,
          status: { notIn: ['cancelled'] },
          reservedAt: { gte: monthStart },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          tenantId,
          status: { in: ['reserved', 'attended', 'waiting_payment'] },
        },
        include: { event: { select: { price: true } } },
      }),
      this.prisma.tenantLiffAccess.count({
        where: { tenantId, accessedAt: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.reservation.count({
        where: {
          tenantId,
          status: { notIn: ['cancelled'] },
          reservedAt: { gte: todayStart, lt: todayEnd },
        },
      }),
    ]);

    const totalRevenue = paidReservations.reduce(
      (sum, r) => sum + r.event.price,
      0,
    );

    return {
      memberCount,
      thisMonthEventCount,
      totalReservationCount,
      thisMonthReservationCount,
      totalRevenue,
      todayAccessCount,
      todayReservationCount,
    };
  }

  async syncLineProfile(tenantId: string) {
    const tenant = await this.findRaw(tenantId);
    if (!tenant.lineChannelAccessToken) {
      throw new BadRequestException(
        'LINE Channel Access Tokenが設定されていません',
      );
    }

    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${tenant.lineChannelAccessToken}` },
    });
    if (!res.ok) {
      throw new BadRequestException('LINEアカウント情報の取得に失敗しました');
    }
    const data = (await res.json()) as {
      displayName: string;
      pictureUrl?: string;
    };

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        lineDisplayName: data.displayName,
        linePictureUrl: data.pictureUrl ?? null,
      },
    });
    return this.toSafeTenant(updated);
  }

  private supportThreadId(tenantId: string) {
    return `tenant:${tenantId}`;
  }

  async getSupportMessages(tenantId: string) {
    await this.findOne(tenantId);
    const lineUserId = this.supportThreadId(tenantId);
    await this.prisma.supportMessage.updateMany({
      where: { lineUserId, fromUser: false, read: false },
      data: { read: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendSupportMessage(tenantId: string, content: string) {
    await this.findOne(tenantId);
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('メッセージを入力してください');
    return this.prisma.supportMessage.create({
      data: {
        tenantId,
        lineUserId: this.supportThreadId(tenantId),
        content: trimmed,
        fromUser: true,
      },
    });
  }

  async listTenantsForCollab(excludeTenantId: string) {
    return this.prisma.tenant.findMany({
      where: { id: { not: excludeTenantId }, deletedAt: null, bannedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  private parseCollabRequest(content: string) {
    return {
      sourceTenantId:
        content.match(/^申請元団体ID: (.+)$/m)?.[1]?.trim() ?? null,
      sourceTenantName:
        content.match(/^申請元団体: (.+)$/m)?.[1]?.trim() ??
        content.match(/^(.+)からコラボ申請が届きました。$/m)?.[1]?.trim() ??
        null,
      eventId: content.match(/^イベントID: (.+)$/m)?.[1]?.trim() ?? null,
      eventTitle:
        content.match(/^イベント名: (.+)$/m)?.[1]?.trim() ?? 'イベント',
      heldAtLabel: content.match(/^開催日: (.+)$/m)?.[1]?.trim() ?? null,
    };
  }

  private async resolveCollabSourceTenant(
    targetTenantId: string,
    details: ReturnType<TenantService['parseCollabRequest']>,
  ) {
    if (details.sourceTenantId) {
      if (details.sourceTenantId === targetTenantId) return null;
      return this.prisma.tenant.findFirst({
        where: {
          id: details.sourceTenantId,
          deletedAt: null,
          bannedAt: null,
        },
        select: { id: true, name: true },
      });
    }
    if (!details.sourceTenantName) return null;
    return this.prisma.tenant.findFirst({
      where: {
        id: { not: targetTenantId },
        name: details.sourceTenantName,
        deletedAt: null,
        bannedAt: null,
      },
      select: { id: true, name: true },
    });
  }

  private async ensureCollabEventForApproval(
    targetTenantId: string,
    sourceTenantId: string,
    details: ReturnType<TenantService['parseCollabRequest']>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let sourceEvent = details.eventId
        ? await tx.event.findFirst({
            where: { id: details.eventId, tenantId: sourceTenantId },
          })
        : null;

      // 初期版の申請メッセージにはイベントIDがなかったため、タイトルと開催日時で補完する。
      if (!sourceEvent) {
        const candidates = await tx.event.findMany({
          where: { tenantId: sourceTenantId, title: details.eventTitle },
          orderBy: { updatedAt: 'desc' },
        });
        sourceEvent =
          candidates.find(
            (event) =>
              details.heldAtLabel &&
              new Date(event.heldAt).toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
              }) === details.heldAtLabel,
          ) ??
          candidates[0] ??
          null;
      }
      if (!sourceEvent) {
        throw new NotFoundException('申請元のイベントが見つかりません');
      }

      const sourceLink = await tx.collabEventLink.findUnique({
        where: { eventId: sourceEvent.id },
        include: {
          collabGroup: {
            include: {
              eventLinks: {
                include: { event: { select: { id: true, tenantId: true } } },
              },
            },
          },
        },
      });
      const existingTargetEvent = sourceLink?.collabGroup.eventLinks.find(
        (link) => link.event.tenantId === targetTenantId,
      )?.event;
      if (existingTargetEvent) {
        await tx.event.update({
          where: { id: existingTargetEvent.id },
          data: { collabReadOnly: true },
        });
        if (!sourceLink.collabGroup.active) {
          await tx.collabGroup.update({
            where: { id: sourceLink.collabGroupId },
            data: { active: true },
          });
        }
        return { eventId: existingTargetEvent.id, created: false };
      }
      // 申請元1団体 + 選択可能な相手4団体。
      if (sourceLink && sourceLink.collabGroup.eventLinks.length >= 5) {
        throw new BadRequestException(
          'このコラボイベントにはすでに4団体が参加しています',
        );
      }

      const {
        id: _sourceEventId,
        tenantId: _sourceEventTenantId,
        rosterShareToken: _sourceRosterShareToken,
        remindedAt: _sourceRemindedAt,
        viewCount: _sourceViewCount,
        createdAt: _sourceCreatedAt,
        updatedAt: _sourceUpdatedAt,
        ...eventData
      } = sourceEvent;
      const targetEvent = await tx.event.create({
        data: {
          ...eventData,
          tenantId: targetTenantId,
          rosterShareEnabled: false,
          rosterShareToken: null,
          collabReadOnly: true,
          remindedAt: null,
          viewCount: 0,
        },
      });

      if (sourceLink) {
        await tx.collabEventLink.create({
          data: {
            collabGroupId: sourceLink.collabGroupId,
            eventId: targetEvent.id,
          },
        });
        if (!sourceLink.collabGroup.active) {
          await tx.collabGroup.update({
            where: { id: sourceLink.collabGroupId },
            data: { active: true },
          });
        }
      } else {
        await tx.collabGroup.create({
          data: {
            label: sourceEvent.title,
            viewToken: randomBytes(24).toString('base64url'),
            eventLinks: {
              create: [
                { eventId: sourceEvent.id },
                { eventId: targetEvent.id },
              ],
            },
          },
        });
      }
      return { eventId: targetEvent.id, created: true };
    });
  }

  async syncApprovedCollabRequests(tenantId: string) {
    await this.findOne(tenantId);
    const messages = await this.prisma.supportMessage.findMany({
      where: {
        tenantId,
        lineUserId: this.supportThreadId(tenantId),
        fromUser: false,
        content: { startsWith: '【コラボ申請（承認済み）】' },
      },
      orderBy: { createdAt: 'asc' },
    });
    let created = 0;
    let linked = 0;
    const errors: string[] = [];
    for (const message of messages) {
      try {
        const details = this.parseCollabRequest(message.content);
        const sourceTenant = await this.resolveCollabSourceTenant(
          tenantId,
          details,
        );
        if (!sourceTenant) {
          errors.push(`${message.id}: 申請元団体が見つかりません`);
          continue;
        }
        const result = await this.ensureCollabEventForApproval(
          tenantId,
          sourceTenant.id,
          details,
        );
        if (result.created) created += 1;
        linked += 1;
      } catch (error) {
        errors.push(
          `${message.id}: ${error instanceof Error ? error.message : '反映に失敗しました'}`,
        );
      }
    }
    return { checked: messages.length, linked, created, errors };
  }

  async respondToCollabRequest(
    tenantId: string,
    messageId: string,
    status: 'approved' | 'rejected',
  ) {
    const message = await this.prisma.supportMessage.findFirst({
      where: {
        id: messageId,
        tenantId,
        lineUserId: this.supportThreadId(tenantId),
        fromUser: false,
      },
    });
    if (!message || !message.content.startsWith('【コラボ申請')) {
      throw new NotFoundException('コラボ申請が見つかりません');
    }
    if (
      message.content.startsWith('【コラボ申請（承認済み）】') ||
      message.content.startsWith('【コラボ申請（辞退済み）】')
    ) {
      throw new BadRequestException('このコラボ申請には回答済みです');
    }

    const details = this.parseCollabRequest(message.content);
    const [targetTenant, sourceTenant] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
      this.resolveCollabSourceTenant(tenantId, details),
    ]);
    if (!targetTenant || !sourceTenant) {
      throw new NotFoundException('申請元または申請先の団体が見つかりません');
    }

    const responseLabel = status === 'approved' ? '承認' : '辞退';
    const responseState = status === 'approved' ? '承認済み' : '辞退済み';
    const responseContent = this.formatCollabResponseContent(
      message.content,
      responseState,
    );
    if (status === 'approved') {
      await this.ensureCollabEventForApproval(
        tenantId,
        sourceTenant.id,
        details,
      );
    }
    const sourceNotification = [
      '【コラボ申請の回答】',
      `${targetTenant.name}がコラボ申請を${responseLabel}しました。`,
      `イベント名: ${details.eventTitle}`,
      status === 'approved'
        ? '合同開催として反映しました。参加者名簿は統合表示されます。'
        : 'この団体との合同開催は行われません。',
    ].join('\n');

    const [updatedMessage] = await this.prisma.$transaction([
      this.prisma.supportMessage.update({
        where: { id: message.id },
        data: { content: responseContent, read: true },
      }),
      this.prisma.supportMessage.create({
        data: {
          tenantId: sourceTenant.id,
          lineUserId: this.supportThreadId(sourceTenant.id),
          content: sourceNotification,
          fromUser: false,
        },
      }),
    ]);
    return updatedMessage;
  }

  private formatCollabResponseContent(
    content: string,
    state: '承認済み' | '辞退済み',
  ) {
    const lines = content
      .split('\n')
      .filter((line) => !line.startsWith('参加予定団体:'));
    lines[0] = `【コラボ申請（${state}）】`;

    const legacySourceLineIndex = lines.findIndex((line) =>
      line.endsWith('からコラボ申請が届きました。'),
    );
    if (legacySourceLineIndex >= 0) {
      lines[legacySourceLineIndex] = `申請元団体: ${lines[
        legacySourceLineIndex
      ].replace('からコラボ申請が届きました。', '')}`;
    }

    const pendingLineIndex = lines.findIndex((line) =>
      line.includes('合同開催は確定していません'),
    );
    const stateLine =
      state === '承認済み'
        ? 'このコラボ申請を承認しました。'
        : 'このコラボ申請を辞退しました。';
    if (pendingLineIndex >= 0) {
      lines[pendingLineIndex] = stateLine;
    } else {
      lines.push(stateLine);
    }

    const replyLineIndex = lines.findIndex((line) =>
      line.includes('このチャットへ返信してください'),
    );
    if (replyLineIndex >= 0) {
      lines[replyLineIndex] =
        state === '承認済み'
          ? '合同開催として反映しました。参加者名簿は統合表示されます。'
          : 'この団体との合同開催は行われません。';
    }
    return lines.join('\n');
  }

  async createBillingCheckout(tenantId: string, plan: 'standard' | 'pro') {
    const secretKey = process.env.STRIPE_BILLING_SECRET_KEY;
    if (!secretKey)
      throw new InternalServerErrorException('Stripe Billing not configured');

    const priceId =
      plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_STANDARD_PRICE_ID;
    if (!priceId)
      throw new InternalServerErrorException(
        `Price ID for plan "${plan}" not configured`,
      );

    const tenant = await this.findOne(tenantId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const stripe = new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: tenant.stripeCustomerId ?? undefined,
      success_url: `${frontendUrl}/admin/settings/plan?success=true`,
      cancel_url: `${frontendUrl}/admin/settings/plan`,
      metadata: { tenantId, plan },
      subscription_data: { metadata: { tenantId, plan } },
    });

    return { url: session.url };
  }
}
