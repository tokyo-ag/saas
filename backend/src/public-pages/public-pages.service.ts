import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { toRomaji } from '../common/romaji';

const PAGE_STATUS = ['draft', 'published'] as const;
type PageStatus = (typeof PAGE_STATUS)[number];

export class UpsertPublicPageDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageCaptions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dividerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  textColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  navColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  navOpacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  backgroundOpacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  imageLayout?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  heroImageMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  heroNavPosition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  heroImagePosition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  heroTextPosition?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  heroTextX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  heroTextY?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  heroTextWidth?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonBgColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  buttonBgOpacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  buttonTextOpacity?: number;

  @IsOptional()
  @IsArray()
  blocks?: any[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  heroOverlayOpacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  heroOverlayColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reserveViewStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fontFamily?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  titleFont?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  titleColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  subtitleFont?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  subtitleSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  subtitleColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  subtitleMarginTop?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  buttonRadius?: number;

  @IsOptional()
  @IsInt()
  @Min(24)
  @Max(80)
  buttonSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  titleSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  titleAlign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bodySize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  layoutVariant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  aboutLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reserveLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  blogLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

  @IsOptional()
  @IsIn(['text', 'image', 'both'])
  orgNameDisplayType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  orgLogoWordmarkUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  orgLogoWordmarkAlt?: string;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(400)
  orgLogoWordmarkSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonLayout?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  buttonOpacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  headerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  footerText?: string;

  @IsOptional()
  @IsIn(PAGE_STATUS)
  status?: PageStatus;
}

@Injectable()
export class PublicPagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async normalizeSlug(input: string) {
    const romaji = input.trim() ? await toRomaji(input) : input;
    return romaji
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .normalize('NFC');
  }

  private async slugFromTitle(title: string) {
    const slug = await this.normalizeSlug(title);
    return slug || `page-${Date.now()}`;
  }

  private async ensureUniqueSlug(
    tenantId: string,
    slug: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.publicPage.findFirst({
      where: {
        tenantId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Slug already exists');
  }

  private pageData(dto: UpsertPublicPageDto, currentStatus?: string) {
    const status = dto.status ?? currentStatus ?? 'published';
    if (!PAGE_STATUS.includes(status as PageStatus)) {
      throw new BadRequestException('status must be draft or published');
    }
    const isPublishing =
      status === 'published' && currentStatus !== 'published';

    return {
      title: dto.title.trim(),
      body: dto.body,
      subtitle: dto.subtitle?.trim() || null,
      coverImageUrl: dto.coverImageUrl?.trim() || null,
      imageUrls: (dto.imageUrls ?? [])
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 3),
      imageCaptions: (dto.imageCaptions ?? [])
        .map((caption) => caption.trim())
        .slice(0, 3),
      dividerText: dto.dividerText?.trim() || null,
      textColor: dto.textColor?.trim() || null,
      accentColor: dto.accentColor?.trim() || null,
      backgroundColor: dto.backgroundColor?.trim() || null,
      navColor: dto.navColor?.trim() || null,
      navOpacity: Number.isInteger(dto.navOpacity) ? dto.navOpacity : null,
      backgroundOpacity: Number.isInteger(dto.backgroundOpacity)
        ? dto.backgroundOpacity
        : null,
      imageLayout: dto.imageLayout?.trim() || null,
      heroImageMode: dto.heroImageMode?.trim() || null,
      heroNavPosition: dto.heroNavPosition?.trim() || null,
      heroImagePosition: dto.heroImagePosition?.trim() || null,
      heroTextPosition: dto.heroTextPosition?.trim() || null,
      heroTextX: Number.isInteger(dto.heroTextX) ? dto.heroTextX : null,
      heroTextY: Number.isInteger(dto.heroTextY) ? dto.heroTextY : null,
      heroTextWidth: Number.isInteger(dto.heroTextWidth)
        ? dto.heroTextWidth
        : null,
      buttonBgColor: dto.buttonBgColor?.trim() || null,
      buttonBgOpacity: Number.isInteger(dto.buttonBgOpacity)
        ? dto.buttonBgOpacity
        : null,
      buttonTextOpacity: Number.isInteger(dto.buttonTextOpacity)
        ? dto.buttonTextOpacity
        : null,
      blocks: dto.blocks ?? Prisma.JsonNull,
      heroOverlayOpacity: Number.isInteger(dto.heroOverlayOpacity)
        ? dto.heroOverlayOpacity
        : null,
      heroOverlayColor: dto.heroOverlayColor?.trim() || null,
      reserveViewStyle: dto.reserveViewStyle?.trim() || null,
      fontFamily: dto.fontFamily?.trim() || null,
      titleFont: dto.titleFont?.trim() || null,
      titleColor: dto.titleColor?.trim() || null,
      subtitleFont: dto.subtitleFont?.trim() || null,
      subtitleSize: dto.subtitleSize?.trim() || null,
      subtitleColor: dto.subtitleColor?.trim() || null,
      subtitleMarginTop: Number.isInteger(dto.subtitleMarginTop)
        ? dto.subtitleMarginTop
        : null,
      buttonRadius: Number.isInteger(dto.buttonRadius)
        ? dto.buttonRadius
        : null,
      buttonSize: Number.isInteger(dto.buttonSize) ? dto.buttonSize : null,
      titleSize: dto.titleSize?.trim() || null,
      titleAlign: dto.titleAlign?.trim() || null,
      bodySize: dto.bodySize?.trim() || null,
      layoutVariant: dto.layoutVariant?.trim() || null,
      aboutLabel: dto.aboutLabel?.trim() || null,
      reserveLabel: dto.reserveLabel?.trim() || null,
      blogLabel: dto.blogLabel?.trim() || null,
      contactLabel: dto.contactLabel?.trim() || null,
      buttonStyle: dto.buttonStyle?.trim() || null,
      buttonLayout: dto.buttonLayout?.trim() || null,
      buttonOpacity: Number.isInteger(dto.buttonOpacity)
        ? dto.buttonOpacity
        : null,
      headerText: dto.headerText?.trim() || null,
      footerText: dto.footerText?.trim() || null,
      seoTitle: dto.seoTitle?.trim() || null,
      seoDescription: dto.seoDescription?.trim() || null,
      orgNameDisplayType: dto.orgNameDisplayType ?? 'text',
      orgLogoWordmarkUrl: dto.orgLogoWordmarkUrl?.trim() || null,
      orgLogoWordmarkAlt: dto.orgLogoWordmarkAlt?.trim() || null,
      orgLogoWordmarkSize: Number.isInteger(dto.orgLogoWordmarkSize)
        ? dto.orgLogoWordmarkSize
        : null,
      status,
      ...(isPublishing ? { publishedAt: new Date() } : {}),
      ...(status === 'draft' ? { publishedAt: null } : {}),
    };
  }

  async list(tenantId: string) {
    return this.prisma.publicPage.findMany({
      where: { tenantId },
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const page = await this.prisma.publicPage.findFirst({
      where: { id, tenantId },
    });
    if (!page) throw new NotFoundException('Public page not found');
    return page;
  }

  async create(tenantId: string, dto: UpsertPublicPageDto) {
    const slug =
      (await this.normalizeSlug(dto.slug ?? '')) ||
      (await this.slugFromTitle(dto.title));
    await this.ensureUniqueSlug(tenantId, slug);

    return this.prisma.publicPage.create({
      data: {
        tenantId,
        slug,
        ...this.pageData(dto),
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpsertPublicPageDto) {
    const current = await this.findOne(tenantId, id);
    const slug = await this.normalizeSlug(dto.slug ?? current.slug);
    if (!slug) throw new BadRequestException('slug is required');
    await this.ensureUniqueSlug(tenantId, slug, id);

    return this.prisma.publicPage.update({
      where: { id },
      data: {
        slug,
        ...this.pageData(dto, current.status),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.publicPage.delete({ where: { id } });
    return { ok: true };
  }
}
