import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

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
  @IsString()
  @MaxLength(20)
  imageLayout?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  heroImageMode?: string;

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
  @IsString()
  @MaxLength(20)
  buttonStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonLayout?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  headerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  footerText?: string;

  @IsOptional()
  @IsIn(PAGE_STATUS)
  status?: PageStatus;
}

@Injectable()
export class PublicPagesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSlug(input: string) {
    return input
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private slugFromTitle(title: string) {
    const slug = this.normalizeSlug(title);
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
    const isPublishing = status === 'published' && currentStatus !== 'published';

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
      imageLayout: dto.imageLayout?.trim() || null,
      heroImageMode: dto.heroImageMode?.trim() || null,
      heroOverlayOpacity: Number.isInteger(dto.heroOverlayOpacity) ? dto.heroOverlayOpacity : null,
      heroOverlayColor: dto.heroOverlayColor?.trim() || null,
      reserveViewStyle: dto.reserveViewStyle?.trim() || null,
      fontFamily: dto.fontFamily?.trim() || null,
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
      headerText: dto.headerText?.trim() || null,
      footerText: dto.footerText?.trim() || null,
      seoTitle: dto.seoTitle?.trim() || null,
      seoDescription: dto.seoDescription?.trim() || null,
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
    const slug = this.normalizeSlug(dto.slug ?? '') || this.slugFromTitle(dto.title);
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
    const slug = this.normalizeSlug(dto.slug ?? current.slug);
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
