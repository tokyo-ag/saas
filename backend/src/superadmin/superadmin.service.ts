import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export class CreateTenantDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?:
    | 'free'
    | 'standard'
    | 'pro';
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?:
    | 'free'
    | 'standard'
    | 'pro';
  @IsOptional() @IsString() code?: string;
}

export class BanUserDto {
  @IsString() lineUserId: string;
  @IsOptional() @IsString() reason?: string;
}

export class UpdateOfficialSiteDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroLead?: string;
  @IsOptional() @IsString() primaryCtaLabel?: string;
  @IsOptional() @IsString() primaryCtaHref?: string;
  @IsOptional() @IsString() secondaryCtaLabel?: string;
  @IsOptional() @IsString() secondaryCtaHref?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

export class UpsertOfficialArticleDto {
  @IsString() title: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsString() body: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() targetKeyword?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaHref?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsOptional() @IsString() status?: string;
}

type OfficialSiteRow = {
  id: string;
  status: string;
  hero_title: string;
  hero_lead: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: Date;
};

type OfficialArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  target_keyword: string | null;
  cta_label: string | null;
  cta_href: string | null;
  og_image_url: string | null;
  status: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class SuperadminService implements OnApplicationBootstrap {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async onApplicationBootstrap() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, code: true },
    });
    for (const t of tenants) {
      if (!t.code || !/^\d{8}$/.test(t.code)) {
        const code = await this.generateUniqueCode();
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: { code },
        });
      }
    }
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        plan: true,
        bannedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        lineChannelAccessToken: true,
        _count: { select: { members: true } },
        organizerAccounts: { select: { email: true }, take: 1 },
      },
    });
    return tenants.map(
      ({ _count, organizerAccounts, lineChannelAccessToken, ...t }) => ({
        ...t,
        lineConfigured: Boolean(lineChannelAccessToken),
        memberCount: _count.members,
        organizerEmail: organizerAccounts[0]?.email ?? null,
      }),
    );
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
    if (tenant.bannedAt)
      throw new BadRequestException(
        'この団体は永久BANされており復元できません',
      );
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await this.prisma.tenant.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('コード生成に失敗しました');
  }

  async createTenant(dto: CreateTenantDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const id = `tenant-${Date.now()}`;
    const code = await this.generateUniqueCode();
    const tenant = await this.prisma.tenant.create({
      data: {
        id,
        code,
        name: dto.name,
        description: dto.description,
        plan: dto.plan ?? 'free',
        organizerAccounts: {
          create: {
            email: normalizedEmail,
            passwordHash,
            emailVerifiedAt: new Date(),
          },
        },
      },
      select: { id: true, name: true, code: true, plan: true, createdAt: true },
    });
    return tenant;
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
        ...(dto.code !== undefined && {
          code: dto.code.trim().toLowerCase() || null,
        }),
      },
      select: { id: true, name: true, code: true, plan: true, updatedAt: true },
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
    return this.prisma.bannedLineUser.findMany({
      orderBy: { bannedAt: 'desc' },
    });
  }

  async banUser(dto: BanUserDto) {
    return this.prisma.bannedLineUser.upsert({
      where: { lineUserId: dto.lineUserId },
      create: { lineUserId: dto.lineUserId, reason: dto.reason },
      update: { reason: dto.reason, bannedAt: new Date() },
    });
  }

  async impersonate(tenantId: string): Promise<{ token: string }> {
    const account = await this.prisma.organizerAccount.findFirst({
      where: { tenantId },
    });
    if (!account)
      throw new NotFoundException('この団体にアカウントがありません');
    const token = this.jwt.sign({ tenantId, accountId: account.id });
    return { token };
  }

  async unbanUser(lineUserId: string) {
    const banned = await this.prisma.bannedLineUser.findUnique({
      where: { lineUserId },
    });
    if (!banned) throw new NotFoundException('Banned user not found');
    await this.prisma.bannedLineUser.delete({ where: { lineUserId } });
    return { message: 'unbanned' };
  }

  async getSupportThreads() {
    const messages = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const threadMap = new Map<
      string,
      {
        lineUserId: string;
        tenantId: string | null;
        lastMessage: string;
        lastAt: Date;
        unread: number;
      }
    >();
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
    return Array.from(threadMap.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
    );
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

  async getErrorLogs() {
    return this.prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async clearErrorLogs() {
    await this.prisma.errorLog.deleteMany();
    return { message: 'cleared' };
  }

  async replySupportMessage(lineUserId: string, content: string) {
    const latest = await this.prisma.supportMessage.findFirst({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true },
    });
    return this.prisma.supportMessage.create({
      data: {
        lineUserId,
        tenantId: latest?.tenantId ?? null,
        content,
        fromUser: false,
      },
    });
  }

  private mapOfficialSite(row: OfficialSiteRow) {
    return {
      id: row.id,
      status: row.status,
      heroTitle: row.hero_title,
      heroLead: row.hero_lead,
      primaryCtaLabel: row.primary_cta_label,
      primaryCtaHref: row.primary_cta_href,
      secondaryCtaLabel: row.secondary_cta_label,
      secondaryCtaHref: row.secondary_cta_href,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      updatedAt: row.updated_at,
    };
  }

  private mapOfficialArticle(row: OfficialArticleRow) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      body: row.body,
      category: row.category,
      targetKeyword: row.target_keyword,
      ctaLabel: row.cta_label,
      ctaHref: row.cta_href,
      ogImageUrl: row.og_image_url,
      status: row.status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private officialArticleSelect() {
    return Prisma.sql`
      SELECT
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        target_keyword,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
      FROM official_articles
    `;
  }

  private normalizeStatus(status: string | undefined) {
    return status === 'draft' ? 'draft' : 'published';
  }

  private slugify(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || `article-${Date.now()}`
    );
  }

  private async uniqueOfficialArticleSlug(base: string, excludeId?: string) {
    let slug = base;
    let n = 0;
    while (true) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        excludeId
          ? Prisma.sql`SELECT id FROM official_articles WHERE slug = ${slug} AND id <> ${excludeId} LIMIT 1`
          : Prisma.sql`SELECT id FROM official_articles WHERE slug = ${slug} LIMIT 1`,
      );
      if (rows.length === 0) return slug;
      slug = `${base}-${++n}`;
    }
  }

  async getOfficialSite() {
    const rows = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      SELECT
        id,
        status,
        hero_title,
        hero_lead,
        primary_cta_label,
        primary_cta_href,
        secondary_cta_label,
        secondary_cta_href,
        seo_title,
        seo_description,
        updated_at
      FROM official_site_settings
      WHERE id = 'default'
      LIMIT 1
    `);

    if (rows[0]) return this.mapOfficialSite(rows[0]);

    const created = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      INSERT INTO official_site_settings (id)
      VALUES ('default')
      ON CONFLICT (id) DO NOTHING
      RETURNING
        id,
        status,
        hero_title,
        hero_lead,
        primary_cta_label,
        primary_cta_href,
        secondary_cta_label,
        secondary_cta_href,
        seo_title,
        seo_description,
        updated_at
    `);
    if (!created[0]) throw new NotFoundException('Official site not found');
    return this.mapOfficialSite(created[0]);
  }

  async updateOfficialSite(dto: UpdateOfficialSiteDto) {
    const current = await this.getOfficialSite();
    const status = this.normalizeStatus(dto.status ?? current.status);
    const rows = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      UPDATE official_site_settings
      SET
        status = ${status},
        hero_title = ${dto.heroTitle?.trim() || current.heroTitle},
        hero_lead = ${dto.heroLead?.trim() || current.heroLead},
        primary_cta_label = ${dto.primaryCtaLabel?.trim() || current.primaryCtaLabel},
        primary_cta_href = ${dto.primaryCtaHref?.trim() || current.primaryCtaHref},
        secondary_cta_label = ${dto.secondaryCtaLabel?.trim() || current.secondaryCtaLabel},
        secondary_cta_href = ${dto.secondaryCtaHref?.trim() || current.secondaryCtaHref},
        seo_title = ${dto.seoTitle?.trim() || null},
        seo_description = ${dto.seoDescription?.trim() || null},
        updated_at = NOW()
      WHERE id = 'default'
      RETURNING
        id,
        status,
        hero_title,
        hero_lead,
        primary_cta_label,
        primary_cta_href,
        secondary_cta_label,
        secondary_cta_href,
        seo_title,
        seo_description,
        updated_at
    `);
    return this.mapOfficialSite(rows[0]);
  }

  async listOfficialArticles() {
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      ${this.officialArticleSelect()}
      ORDER BY updated_at DESC
    `);
    return rows.map((row) => this.mapOfficialArticle(row));
  }

  async createOfficialArticle(dto: UpsertOfficialArticleDto) {
    if (!dto.title?.trim() || !dto.body?.trim()) {
      throw new BadRequestException('Title and body are required');
    }
    const status = this.normalizeStatus(dto.status);
    const slug = await this.uniqueOfficialArticleSlug(
      this.slugify(dto.slug?.trim() || dto.title),
    );
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      INSERT INTO official_articles (
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        target_keyword,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
      )
      VALUES (
        ${randomUUID()},
        ${dto.title.trim()},
        ${slug},
        ${dto.excerpt?.trim() || null},
        ${dto.body.trim()},
        ${dto.category?.trim() || null},
        ${dto.targetKeyword?.trim() || null},
        ${dto.ctaLabel?.trim() || null},
        ${dto.ctaHref?.trim() || null},
        ${dto.ogImageUrl?.trim() || null},
        ${status},
        ${status === 'published' ? new Date() : null},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        target_keyword,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
    `);
    return this.mapOfficialArticle(rows[0]);
  }

  async updateOfficialArticle(id: string, dto: UpsertOfficialArticleDto) {
    const existing = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      ${this.officialArticleSelect()}
      WHERE id = ${id}
      LIMIT 1
    `);
    if (!existing[0]) throw new NotFoundException('Article not found');
    const current = existing[0];
    const status = this.normalizeStatus(dto.status ?? current.status);
    const slug = await this.uniqueOfficialArticleSlug(
      this.slugify(dto.slug?.trim() || current.slug || dto.title),
      id,
    );
    const publishedAt =
      status === 'draft'
        ? null
        : current.published_at ?? new Date();

    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      UPDATE official_articles
      SET
        title = ${dto.title?.trim() || current.title},
        slug = ${slug},
        excerpt = ${dto.excerpt?.trim() || null},
        body = ${dto.body?.trim() || current.body},
        category = ${dto.category?.trim() || null},
        target_keyword = ${dto.targetKeyword?.trim() || null},
        cta_label = ${dto.ctaLabel?.trim() || null},
        cta_href = ${dto.ctaHref?.trim() || null},
        og_image_url = ${dto.ogImageUrl?.trim() || null},
        status = ${status},
        published_at = ${publishedAt},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        target_keyword,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
    `);
    return this.mapOfficialArticle(rows[0]);
  }

  async deleteOfficialArticle(id: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM official_articles WHERE id = ${id}
    `);
    return { ok: true };
  }
}
