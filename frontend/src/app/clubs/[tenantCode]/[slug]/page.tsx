import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { BlogPostSummary, LiffEvent, PublicCmsPage } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';
import { ReservationViewShowcase } from '@/components/public/ReservationViewShowcase';
import { SnsBlock } from '@/components/public/SnsBlock';

export const revalidate = 60;

async function fetchPage(tenantCode: string, slug: string): Promise<PublicCmsPage | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/pages/${slug}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchReserveEvents(tenantCode: string): Promise<LiffEvent[]> {
  try {
    const res = await fetch(`${API_URL}/api/liff/${tenantCode}/events`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchBlogPosts(tenantCode: string): Promise<BlogPostSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function descriptionFromPage(page: PublicCmsPage) {
  return (
    page.seoDescription ||
    page.body
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/[*_~`>|\\]/g, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 150)
  );
}

const fontFamilyMap: Record<string, string> = {
  mincho: '"Yu Mincho", "Hiragino Mincho ProN", serif',
  handwriting: '"Hachi Maru Pop", "Comic Sans MS", "Yu Gothic", cursive',
  marker: '"Arial Rounded MT Bold", "Arial Black", "Yu Gothic", sans-serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  rounded: '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif',
  serif: '"Yu Mincho", "Hiragino Mincho ProN", serif',
};

const TITLE_SIZE_LEGACY: Record<string, number> = { small: 22, base: 26, large: 30, xl: 36, xlarge: 36 };
const SUBTITLE_SIZE_LEGACY: Record<string, number> = { small: 12, base: 14, large: 16 };
const BODY_SIZE_LEGACY: Record<string, number> = { small: 14, base: 16, large: 18 };

function resolvePxSize(
  value: string | number | null | undefined,
  fallback: number,
  min: number,
  max: number,
  legacy: Record<string, number>,
) {
  const raw = typeof value === 'string' ? value.trim() : value;
  const mapped = typeof raw === 'string' ? legacy[raw] : undefined;
  const parsed = mapped ?? Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function bodyLeadingClass(size: number) {
  if (size <= 14) return 'leading-7';
  if (size >= 19) return 'leading-10';
  if (size >= 17) return 'leading-9';
  return 'leading-8';
}

function renderLine(line: string, index: number, textColor: string, bodyClassName: string, textStyle: CSSProperties = {}) {
  const style: CSSProperties = { color: textColor, overflowWrap: 'anywhere', ...textStyle };
  if (line.startsWith('### ')) return <h3 key={index} className="mt-7 text-xl font-bold" style={{ color: textColor }}>{line.slice(4)}</h3>;
  if (line.startsWith('## ') || line.startsWith('# ')) return <h2 key={index} className="mt-9 text-2xl font-bold" style={{ color: textColor }}>{line.replace(/^#{1,3}\s/, '')}</h2>;
  if (line.startsWith('- ')) return <li key={index} className="ml-5 list-disc break-words" style={style}>{line.slice(2)}</li>;
  if (!line.trim()) return <div key={index} className="h-3" />;
  return <p key={index} className={`${bodyClassName} break-words`} style={style}>{line}</p>;
}

function getBtnClass(style: string | null | undefined) {
  switch (style) {
    case 'pill': return 'rounded-full border-2';
    case 'square': return 'rounded-none border-2';
    case 'double': return 'rounded-lg border-2';
    case 'stylish': return 'rounded-lg border border-dashed';
    case 'gorgeous': return 'rounded-xl border-4 border-double shadow-lg';
    default: return 'rounded-xl border-2';
  }
}

function clampPercent(value: number | string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function hexToRgba(hex: string, opacity: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity / 100})`;
}

function HeroImageBlock({
  images,
  captions,
  mode,
  overlayColor,
  overlayOpacity,
  alt,
  className = 'mt-7 aspect-[16/9]',
}: {
  images: string[];
  captions: string[];
  mode: string;
  overlayColor: string;
  overlayOpacity: number;
  alt: string;
  className?: string;
}) {
  const list = (mode === 'fixed' || mode === 'auto' ? images.slice(0, 1) : images.slice(0, 3));
  if (!list.length) return null;

  const overlayStyle = { backgroundColor: overlayColor, opacity: clampPercent(overlayOpacity) / 100 };

  if (mode === 'background') {
    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`}
        style={{ backgroundImage: `url(${list[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={overlayStyle} />
      </div>
    );
  }

  const useGrid = mode === 'grid' && list.length > 1;

  if (useGrid) {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        {list.map((url, index) => (
          <div key={`${url}-${index}`} className="relative h-full overflow-hidden rounded-xl bg-gray-100">
            <Image src={url} alt={alt} fill className="object-cover" sizes="33vw" priority={index === 0} />
            <div className="absolute inset-0" style={overlayStyle} />
            {captions[index]?.trim() && (
              <p className="absolute bottom-2 left-2 right-2 rounded bg-white/85 px-2 py-1 text-[11px] font-bold text-gray-900 md:text-xs">
                {captions[index]}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  const animation = list.length >= 3
    ? 'public-site-slide-3 12s infinite'
    : list.length === 2
      ? 'public-site-slide-2 9s infinite'
      : undefined;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
      <div className="flex h-full" style={{ width: `${list.length * 100}%`, animation }}>
        {list.map((url, index) => (
          <div key={`${url}-${index}`} className="relative h-full shrink-0" style={{ width: `${100 / list.length}%` }}>
            <Image src={url} alt={alt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" priority={index === 0} />
            <div className="absolute inset-0" style={overlayStyle} />
            {captions[index]?.trim() && (
              <p className="absolute bottom-4 left-4 right-4 rounded bg-white/85 px-3 py-2 text-sm font-bold text-gray-900">
                {captions[index]}
              </p>
            )}
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {list.map((_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-white/80 shadow-sm" />)}
        </div>
      )}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string; slug: string }>;
}): Promise<Metadata> {
  const { tenantCode, slug } = await params;
  const page = await fetchPage(tenantCode, slug);
  if (!page) return { robots: { index: false, follow: false } };

  const tenantName = page.tenant.lineDisplayName ?? page.tenant.name;
  const title = page.seoTitle || `${page.title} | ${tenantName}`;
  const description = descriptionFromPage(page);
  const image = imgUrl(page.imageUrls?.[0] ?? page.coverImageUrl ?? page.tenant.linePictureUrl, IMAGE_BASE_URL);
  const url = `${SITE_URL}/clubs/${page.tenant.code ?? tenantCode}/${page.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      locale: 'ja_JP',
      type: 'article',
      url,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ClubCmsPage({
  params,
}: {
  params: Promise<{ tenantCode: string; slug: string }>;
}) {
  const { tenantCode, slug } = await params;
  const [page, reserveEvents, blogPosts] = await Promise.all([
    fetchPage(tenantCode, slug),
    fetchReserveEvents(tenantCode),
    fetchBlogPosts(tenantCode),
  ]);
  if (!page) notFound();

  const tenantName = page.tenant.lineDisplayName ?? page.tenant.name;
  const orgDisplayType = (page as any).orgNameDisplayType ?? 'text';
  const orgLogoUrl = (page as any).orgLogoWordmarkUrl as string | null;
  const orgLogoAlt = ((page as any).orgLogoWordmarkAlt as string | null) || tenantName;
  const orgLogoSize = ((page as any).orgLogoWordmarkSize as number | null) ?? 60;
  const parsedFt = (() => { try { return JSON.parse(page.footerText ?? '{}'); } catch { return {}; } })();
  const subtitleHeroX: number = parsedFt.subtitleHeroX ?? 5;
  const subtitleHeroY: number | null = parsedFt.subtitleHeroY ?? null;
  const rawSectionOrder: string[] = Array.isArray(parsedFt.sectionOrder) ? parsedFt.sectionOrder : ['name', 'logo', 'subtitle', 'nav', 'image'];
  const sectionOrder: string[] = rawSectionOrder.flatMap((key) => (key === 'title' ? ['name', 'logo'] : [key]));
  const nameBeforeLogo = sectionOrder.indexOf('name') < sectionOrder.indexOf('logo');
  const images = (page.imageUrls?.length ? page.imageUrls : page.coverImageUrl ? [page.coverImageUrl] : [])
    .map((url) => imgUrl(url, IMAGE_BASE_URL))
    .filter(Boolean) as string[];
  const imageCaptions = images.map((_, index) => (page.imageCaptions?.[index] ?? '').slice(0, 80));
  const image = images[0];
  const clubHref = `/clubs/${page.tenant.code ?? tenantCode}`;
  const reserveHref = `/clubs/${page.tenant.code ?? tenantCode}/reserve`;
  const textColor = page.textColor || '#111827';
  const accentColor = page.accentColor || '#06C755';
  const backgroundColor = page.backgroundColor || '#F7F8FA';
  const backgroundOpacity = clampPercent(page.backgroundOpacity ?? 100);
  const bgColor = hexToRgba(backgroundColor, backgroundOpacity);
  const navColor = page.navColor || '#F3F4F6';
  const navOpacity = clampPercent(page.navOpacity ?? 100);
  const navBg = hexToRgba(navColor, navOpacity);
  const fontFamily = fontFamilyMap[page.fontFamily || 'mincho'] ?? fontFamilyMap.mincho;
  const titleFontFamily = page.titleFont ? (fontFamilyMap[page.titleFont] ?? fontFamily) : fontFamily;
  const titleTextColor = page.titleColor || textColor;
  const titleFontSize = resolvePxSize(page.titleSize, 30, 18, 48, TITLE_SIZE_LEGACY);
  const titleTextStyle = { color: titleTextColor, fontFamily: titleFontFamily, fontSize: titleFontSize, lineHeight: 1.25 };
  const subtitleFontFamily = page.subtitleFont ? (fontFamilyMap[page.subtitleFont] ?? fontFamily) : fontFamily;
  const subtitleTextColor = page.subtitleColor || textColor;
  const subtitleFontSize = resolvePxSize(page.subtitleSize, 14, 11, 28, SUBTITLE_SIZE_LEGACY);
  const subtitleTextStyle = { color: subtitleTextColor, fontFamily: subtitleFontFamily, fontSize: subtitleFontSize, lineHeight: 1.6 };
  const bodyFontSize = resolvePxSize(page.bodySize, 16, 12, 24, BODY_SIZE_LEGACY);
  const bodySizeClass = bodyLeadingClass(bodyFontSize);
  const bodyTextStyle = { fontSize: bodyFontSize };
  const navLabels = {
    about: page.aboutLabel || '団体詳細',
    reserve: page.reserveLabel || '予約する',
    blog: page.blogLabel || 'ブログ',
    contact: page.contactLabel || 'お問い合わせ',
  };
  const buttonStyle = page.buttonStyle ?? 'rounded';
  const rawButtonLayout = page.buttonLayout ?? 'grid2x2';
  const buttonLayout = rawButtonLayout === 'row1x4' ? 'row1x4' : 'grid2x2';
  const buttonLayoutClass = buttonLayout === 'row1x4' ? 'grid gap-2' : 'grid gap-3';
  const buttonOpacity = clampPercent(page.buttonOpacity ?? 100);
  const buttonOpacityStyle = { opacity: buttonOpacity / 100 };
  const rawHeroImageMode = page.heroImageMode || 'fixed';
  const heroImageMode = rawHeroImageMode === 'auto'
    ? 'fixed'
    : ['fixed', 'slider', 'background'].includes(rawHeroImageMode)
      ? rawHeroImageMode
      : 'fixed';
  const heroOverlayOpacity = clampPercent(page.heroOverlayOpacity);
  const heroOverlayColor = page.heroOverlayColor || '#000000';
  const btnBorderHex = accentColor;
  const btnClass = getBtnClass(buttonStyle);
  const heroNavPosition = page.heroNavPosition === 'inside' ? 'inside' : 'below';
  const btnBgOpacity = clampPercent(page.buttonBgOpacity ?? 100);
  const btnTextOpacity = clampPercent(page.buttonTextOpacity ?? 100);
  const btnBorderColor = hexToRgba(btnBorderHex, buttonOpacity);
  const btnTextColor = hexToRgba(textColor, btnTextOpacity);
  const btnBgStyle = page.buttonBgColor ? { backgroundColor: hexToRgba(page.buttonBgColor, btnBgOpacity) } : {};
  const btnRadiusStyle = Number.isInteger(page.buttonRadius) ? { borderRadius: `${page.buttonRadius}px` } : {};
  const btnSize = Number.isInteger(page.buttonSize) ? page.buttonSize! : 40;
  const btnSizeStyle = { minHeight: btnSize, ...(buttonStyle === 'pill' ? { height: btnSize } : {}) };
  const btnBoxShadow = buttonStyle === 'double' ? { boxShadow: `inset 0 0 0 3px ${btnBorderColor}` } : {};
  const subtitleGap = Number.isInteger(page.subtitleMarginTop) ? page.subtitleMarginTop! : 8;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: tenantName,
    description: descriptionFromPage(page),
    url: `${SITE_URL}/clubs/${page.tenant.code ?? tenantCode}/${page.slug}`,
    ...(image ? { image, logo: image } : {}),
  };

  const contactHref = `/liff/${page.tenant.code ?? tenantCode}/admin-talk`;
  const sectionCopy = (() => {
    try {
      return JSON.parse(page.footerText ?? '{}') as {
        contact?: string;
        footerTextColor?: string;
        contactColor?: string;
        contactTextColor?: string;
        contactTitle?: string;
        contactLead?: string;
        contactMessage?: string;
        contactTitleColor?: string;
        contactLeadColor?: string;
        contactMessageColor?: string;
        reserveTitle?: string;
        reserveLead?: string;
        reserveTitleColor?: string;
        reserveLeadColor?: string;
        reserveEventTitleColor?: string;
        reserveEventDateColor?: string;
        reserveEventMetaColor?: string;
        reserveEventCardBg?: string;
        reserveActionStyle?: string;
        displayFields?: { location?: boolean; price?: boolean; capacity?: boolean; description?: boolean };
        blogPostCardBg?: string;
        blogTitle?: string;
        blogLead?: string;
        blogTitleColor?: string;
        blogLeadColor?: string;
        reserveLineUrl?: string;
        line?: string;
        footerLine?: string;
        instagram?: string;
        x?: string;
        aboutUrl?: string;
        reserveUrl?: string;
        blogUrl?: string;
        contactUrl?: string;
      };
    } catch {
      return {};
    }
  })();
  const reserveSectionTitle = sectionCopy.reserveTitle?.trim() || navLabels.reserve;
  const reserveSectionLead = sectionCopy.reserveLead?.trim() || '募集中のイベントを表示します。';
  const reserveTitleColor = sectionCopy.reserveTitleColor?.trim() || textColor;
  const reserveLeadColor = sectionCopy.reserveLeadColor?.trim() || '#6B7280';
  const reserveEventTitleColor = sectionCopy.reserveEventTitleColor?.trim() || '#111827';
  const reserveEventDateColor = sectionCopy.reserveEventDateColor?.trim() || '#4B5563';
  const reserveEventMetaColor = sectionCopy.reserveEventMetaColor?.trim() || '#6B7280';
  const reserveEventCardBg = sectionCopy.reserveEventCardBg?.trim() || '#ffffff';
  const blogPostCardBg = sectionCopy.blogPostCardBg?.trim() || '#ffffff';
  const reserveActionStyle = sectionCopy.reserveActionStyle === 'line' ? 'line' : 'comiu';
  const df = sectionCopy.displayFields ?? {};
  const showLocation = df.location !== false;
  const showPrice = df.price !== false;
  const showCapacity = df.capacity === true;
  const showDescription = df.description !== false;
  const navAboutUrl = sectionCopy.aboutUrl?.trim() || '#about';
  const configuredReserveUrl = sectionCopy.reserveUrl?.trim();
  const configuredLineUrl = sectionCopy.reserveLineUrl?.trim() || sectionCopy.line?.trim();
  const lineReserveUrl = configuredLineUrl || configuredReserveUrl || contactHref;
  const navReserveUrl = reserveActionStyle === 'line' ? lineReserveUrl : (configuredReserveUrl || reserveHref);
  const navBlogUrl = sectionCopy.blogUrl?.trim() || '#blog';
  const navContactUrl = sectionCopy.contactUrl?.trim() || contactHref;
  const hasReserveSection = reserveActionStyle === 'line' || reserveEvents.length > 0;
  const hasBlogSection = blogPosts.length > 0;
  const visibleNavItems = [
    { key: 'about', label: navLabels.about, href: navAboutUrl },
    ...(hasBlogSection ? [{ key: 'blog', label: navLabels.blog, href: navBlogUrl }] : []),
    ...(hasReserveSection ? [{ key: 'reserve', label: navLabels.reserve, href: navReserveUrl }] : []),
    { key: 'contact', label: navLabels.contact, href: navContactUrl },
  ];
  const buttonGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${buttonLayout === 'row1x4' ? visibleNavItems.length : Math.min(2, visibleNavItems.length)}, minmax(0, 1fr))`,
  };
  const blogSectionTitle = sectionCopy.blogTitle?.trim() || navLabels.blog;
  const blogSectionLead = sectionCopy.blogLead?.trim() || '活動日記やお知らせを表示するエリアです。';
  const blogTitleColor = sectionCopy.blogTitleColor?.trim() || textColor;
  const blogLeadColor = sectionCopy.blogLeadColor?.trim() || '#6B7280';
  const contactMessageColorRaw = sectionCopy.contactMessageColor?.trim();
  const contactMessageColor =
    !contactMessageColorRaw || ['#6B7280', '#9CA3AF'].includes(contactMessageColorRaw.toUpperCase())
      ? '#111827'
      : contactMessageColorRaw;
  const contactTextColorRaw = sectionCopy.contactTextColor?.trim();
  const contactTextColor =
    !contactTextColorRaw || ['#6B7280', '#9CA3AF'].includes(contactTextColorRaw.toUpperCase())
      ? '#111827'
      : contactTextColorRaw;
  const footerTextColorRaw = sectionCopy.footerTextColor?.trim();
  const footerTextColor =
    !footerTextColorRaw || ['#6B7280', '#9CA3AF'].includes(footerTextColorRaw.toUpperCase())
      ? '#111827'
      : footerTextColorRaw;

  return (
    <main className="min-h-screen sm:bg-gray-200" style={{ fontFamily, backgroundColor: bgColor }}>
      <div className="mx-auto w-full max-w-[480px] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl" style={{ backgroundColor: bgColor, minHeight: '100dvh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <style>{`
        @keyframes public-site-slide-2 {
          0%, 42% { transform: translateX(0); }
          50%, 92% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes public-site-slide-3 {
          0%, 30% { transform: translateX(0); }
          36%, 64% { transform: translateX(-33.333%); }
          70%, 98% { transform: translateX(-66.666%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {heroImageMode === 'background' && images[0] ? (
        /* 背景モード: 大きいヒーローエリア */
        <>
          <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
            <div className="absolute inset-0" style={{ backgroundImage: `url(${images[0]})`, backgroundSize: 'cover', backgroundPosition: page.heroImagePosition ?? 'center center' }} />
            <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(heroOverlayColor, heroOverlayOpacity) }} />
            <div className="relative z-10" style={{ minHeight: 220 }}>
              {/* テキストブロック - X/Y/Width で自由配置 */}
              <div
                className="absolute"
                style={{
                  left: `${page.heroTextX ?? 5}%`,
                  top: `${page.heroTextY ?? 65}%`,
                  width: `${page.heroTextWidth ?? 85}%`,
                }}
              >
                <h1 className="font-bold drop-shadow" style={titleTextStyle}>
                  {orgLogoUrl && orgDisplayType !== 'text' ? (
                    <>
                      {!nameBeforeLogo && (
                        <img src={orgLogoUrl} alt={orgLogoAlt}
                          className="max-w-full object-contain drop-shadow"
                          style={{ height: orgLogoSize, maxWidth: '100%' }} />
                      )}
                      {orgDisplayType === 'both'
                        ? <span>{tenantName}</span>
                        : <span className="sr-only">{tenantName}</span>
                      }
                      {nameBeforeLogo && (
                        <img src={orgLogoUrl} alt={orgLogoAlt}
                          className="max-w-full object-contain drop-shadow"
                          style={{ height: orgLogoSize, maxWidth: '100%' }} />
                      )}
                    </>
                  ) : tenantName}
                </h1>
                {heroNavPosition === 'inside' && (
                  <nav className={`mt-4 ${buttonLayoutClass}`} style={buttonGridStyle}>
                    {visibleNavItems.map((item) => (
                      <Link key={item.key} href={item.href} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{item.label}</Link>
                    ))}
                  </nav>
                )}
              </div>
              {/* サブタイトル - 独立配置 */}
              {page.subtitle && (
                <p
                  className="absolute drop-shadow"
                  style={{
                    left: `${subtitleHeroX}%`,
                    top: subtitleHeroY !== null
                      ? `${subtitleHeroY}%`
                      : `calc(${page.heroTextY ?? 65}% + ${subtitleGap + 32}px)`,
                    width: `${page.heroTextWidth ?? 85}%`,
                    ...subtitleTextStyle,
                  }}
                >
                  {page.subtitle}
                </p>
              )}
            </div>
          </div>
          {heroNavPosition === 'below' && (
            <nav className={`border-b border-black/5 px-3 pb-3 pt-3 ${buttonLayoutClass}`} style={buttonGridStyle}>
              {visibleNavItems.map((item) => (
                <Link key={item.key} href={item.href} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{item.label}</Link>
              ))}
            </nav>
          )}
        </>
      ) : (
        /* 通常モード: セクション順序で描画 */
        <div className="border-b border-gray-100" style={{ backgroundColor: navBg }}>
          {sectionOrder.map((key) => {
            if (key === 'name') return orgDisplayType !== 'image' ? (
              <div key="name" className="px-5 pt-3 pb-1">
                <h1 className="font-bold leading-tight" style={{ ...titleTextStyle, lineHeight: 1.25, margin: 0 }}>
                  <Link href={clubHref} className="block">
                    {tenantName}
                  </Link>
                </h1>
              </div>
            ) : null;
            if (key === 'logo') return orgLogoUrl && orgDisplayType !== 'text' ? (
              <div key="logo" className="px-5 pt-3 pb-1">
                <Link href={clubHref} className="block">
                  <img src={orgLogoUrl} alt={orgLogoAlt} className="max-w-full object-contain" style={{ height: orgLogoSize }} />
                </Link>
              </div>
            ) : null;
            if (key === 'subtitle') return page.subtitle ? (
              <div key="subtitle" className="px-5 py-1">
                <p className="whitespace-pre-wrap" style={subtitleTextStyle}>{page.subtitle}</p>
              </div>
            ) : null;
            if (key === 'nav') return (
              <div key="nav" className="px-5 pt-2 pb-4">
                <nav className={`${buttonLayoutClass}`} style={buttonGridStyle}>
                  {visibleNavItems.map((item) => (
                    <Link key={item.key} href={item.href} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{item.label}</Link>
                  ))}
                </nav>
              </div>
            );
            if (key === 'image') return images.length ? (
              <div key="image" className="px-5 pb-5">
                <HeroImageBlock
                  images={images}
                  captions={imageCaptions}
                  mode={heroImageMode}
                  overlayColor={heroOverlayColor}
                  overlayOpacity={heroOverlayOpacity}
                  alt={page.title}
                />
              </div>
            ) : null;
            return null;
          })}
        </div>
      )}

      <article id="about" className={`px-4 ${heroImageMode === 'background' ? 'pt-4 pb-8' : 'pt-4 pb-8'}`}>

        <div className={`rounded-xl px-5 py-6 shadow-sm ring-1 ring-gray-100 md:px-8 md:py-8 ${heroImageMode === 'background' ? '' : 'mt-0'}`} style={{ backgroundColor: navBg }}>
          {page.blocks?.length ? (
            <div className="space-y-5">
              {(page.blocks as any[]).map((block: any, i: number) => {
                const blockFontSize = resolvePxSize(block.fontSize, bodyFontSize, 10, 28, BODY_SIZE_LEGACY);
                const blockBodyClass = bodyLeadingClass(blockFontSize);
                const blockTextStyle = { fontSize: blockFontSize };
                if (block.type === 'media-text') {
                  const isLeft = block.imagePosition !== 'right';
                  return (
                    <div key={i} className={`flex items-start gap-3 ${!isLeft ? 'flex-row-reverse' : ''}`}>
                      {block.imageUrl && (
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                          <Image src={block.imageUrl} alt="" fill className="object-cover" sizes="96px" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                        </div>
                      )}
                      <div className={`min-w-0 flex-1 space-y-1 ${blockBodyClass}`} style={{ color: textColor, ...blockTextStyle }}>
                        {block.content.split('\n').map((line: string, j: number) => renderLine(line, j, textColor, blockBodyClass, blockTextStyle))}
                      </div>
                    </div>
                  );
                }
                if (block.type === 'profile') {
                  return (
                    <div key={i} className="flex gap-4">
                      {block.imageUrl && (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                          <Image src={block.imageUrl} alt="" fill className="object-cover" sizes="80px" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                        </div>
                      )}
                      <div className={`min-w-0 space-y-1 ${blockBodyClass}`} style={{ color: textColor, ...blockTextStyle }}>
                        {block.content.split('\n').map((line: string, j: number) => renderLine(line, j, textColor, blockBodyClass, blockTextStyle))}
                      </div>
                    </div>
                  );
                }
                if (block.type === 'feature') {
                  return (
                    <div key={i} className="space-y-3">
                      {block.imageUrl && (
                        <div className="relative h-56 w-full overflow-hidden rounded-xl">
                          <Image src={block.imageUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                        </div>
                      )}
                      <div className={`space-y-1 ${blockBodyClass}`} style={{ color: textColor, ...blockTextStyle }}>
                        {block.content.split('\n').map((line: string, j: number) => renderLine(line, j, textColor, blockBodyClass, blockTextStyle))}
                      </div>
                    </div>
                  );
                }
                if (block.type === 'faq') {
                  const items = (block.faqItems ?? []).filter((item: {q:string;a:string}) => item.q);
                  return (
                    <div key={i} className="space-y-1.5">
                      {items.map((item: {q:string;a:string}, j: number) => (
                        <details key={j} className="group overflow-hidden rounded-xl border border-gray-100">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 select-none" style={{ color: textColor }}>
                            <span className="flex-1 font-bold text-sm">{item.q}</span>
                            <span className="ml-2 shrink-0 text-xs text-gray-400 transition-transform duration-200 group-open:rotate-180">▼</span>
                          </summary>
                          <div className="border-t border-gray-100 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: textColor, opacity: 0.8 }}>
                            {item.a}
                          </div>
                        </details>
                      ))}
                    </div>
                  );
                }
                if (block.type === 'sns') {
                  return (
                    <SnsBlock key={i}
                      instagramUrl={block.instagramUrl}
                      xUrl={block.xUrl}
                      threadsUrl={block.threadsUrl}
                      instagramLabel={block.instagramLabel}
                      xLabel={block.xLabel}
                      threadsLabel={block.threadsLabel}
                      xUsername={block.xUsername}
                      instagramEmbedUrl={block.instagramEmbedUrl}
                      threadsEmbedUrl={block.threadsEmbedUrl}
                      accentColor={accentColor}
                    />
                  );
                }
                // text
                return (
                  <div key={i} className={`space-y-1 ${blockBodyClass}`} style={{ color: textColor, ...blockTextStyle }}>
                    {block.content.split('\n').map((line: string, j: number) => renderLine(line, j, textColor, blockBodyClass, blockTextStyle))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`space-y-2 ${bodySizeClass}`} style={bodyTextStyle}>
              {page.body.split('\n').map((line, index) => renderLine(line, index, textColor, bodySizeClass, bodyTextStyle))}
            </div>
          )}
        </div>

        {hasReserveSection && (
        <div id="reserve" className="relative mt-8 scroll-mt-6 rounded-xl px-5 py-6 shadow-sm ring-1 ring-black/5" style={{ backgroundColor: navBg }}>
          <div className="relative">
            <p className="text-lg font-bold" style={{ color: reserveTitleColor }}>{reserveSectionTitle}</p>
            {reserveSectionLead && (
              <p className="mt-2 text-sm leading-7" style={{ color: reserveLeadColor }}>{reserveSectionLead}</p>
            )}
            {reserveActionStyle === 'line' && reserveEvents.length === 0 ? (
              <Link
                href={lineReserveUrl}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-bold transition hover:opacity-80"
                style={{ backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }}
              >
                LINEで予約する
              </Link>
            ) : (
              <ReservationViewShowcase
                accentColor={accentColor}
                buttonLabel={reserveActionStyle === 'line' ? 'LINEで友達追加して予約する' : navLabels.reserve}
                href={reserveActionStyle === 'line' ? lineReserveUrl : navReserveUrl}
                viewStyle={page.reserveViewStyle}
                events={reserveEvents}
                tenantCode={reserveActionStyle === 'line' ? undefined : (page.tenant.code ?? tenantCode)}
                lineMode={reserveActionStyle === 'line'}
                showLocation={showLocation}
                showPrice={showPrice}
                showCapacity={showCapacity}
                showDescription={showDescription}
                eventTitleColor={reserveEventTitleColor}
                eventDateColor={reserveEventDateColor}
                eventMetaColor={reserveEventMetaColor}
                eventCardBg={reserveEventCardBg}
                className="mt-4"
              />
            )}
          </div>
        </div>
        )}

        {hasBlogSection && (
        <section id="blog" className="relative mt-8 scroll-mt-6 rounded-xl px-5 py-6 shadow-sm ring-1 ring-black/5" style={{ backgroundColor: navBg }}>
          <Link href={navBlogUrl} className="absolute inset-0 rounded-xl" aria-label={navLabels.blog} />
          <div className="relative">
            <p className="text-lg font-bold" style={{ color: blogTitleColor }}>{blogSectionTitle}</p>
            {blogSectionLead && (
              <p className="mt-2 text-sm leading-7" style={{ color: blogLeadColor }}>{blogSectionLead}</p>
            )}
            {blogPosts.length > 0 && (
              <div className="mt-4 space-y-3">
                {blogPosts.slice(0, 3).map((post) => {
                  const postImage = imgUrl(post.coverImageUrl, IMAGE_BASE_URL);
                  return (
                    <Link key={post.id} href={`/clubs/${page.tenant.code ?? tenantCode}/blog/${post.slug}`}
                      className="flex gap-3 rounded-xl border border-gray-100 p-3 transition hover:opacity-90"
                      style={{ backgroundColor: blogPostCardBg }}>
                      {postImage && <Image src={postImage} alt="" width={80} height={64} className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-bold leading-5" style={{ color: textColor }}>{post.title}</p>
                        {post.excerpt && <p className="mt-1 line-clamp-2 text-xs leading-5" style={{ color: blogLeadColor }}>{post.excerpt}</p>}
                      </div>
                    </Link>
                  );
                })}
                <Link href={`/clubs/${page.tenant.code ?? tenantCode}/blog`}
                  className="inline-flex text-xs font-bold transition hover:underline"
                  style={{ color: accentColor }}>
                  ブログ一覧を見る
                </Link>
              </div>
            )}
          </div>
        </section>
        )}

        <div id="contact" className="mt-6 scroll-mt-6">
          {(() => {
            const contactLink = sectionCopy.contact
              ? sectionCopy.contact.includes('@')
                ? `mailto:${sectionCopy.contact}`
                : /^\d/.test(sectionCopy.contact)
                  ? `tel:${sectionCopy.contact.replace(/[^\d+]/g, '')}`
                  : contactHref
              : contactHref;
            const btnColor = sectionCopy.contactColor?.trim() || accentColor;
            const subtitle = sectionCopy.contactMessage?.trim();
            return (
              <>
                <Link href={contactLink}
                  className="flex w-full items-center justify-center rounded-xl py-4 text-base font-bold shadow-sm transition hover:opacity-90"
                  style={{ backgroundColor: btnColor, color: contactTextColor }}>
                  {navLabels.contact}
                </Link>
                {subtitle && (
                  <p className="mt-2 text-center text-xs leading-5" style={{ color: contactMessageColor }}>
                    {subtitle}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </article>

      {/* Footer */}
      {(() => {
        const hasSocial = sectionCopy.instagram || sectionCopy.x;
        return (
          <footer className="mt-4 border-t border-gray-100 pb-6 pt-4 text-center">
            {hasSocial && (
              <div className="flex justify-center gap-5">
                {sectionCopy.instagram && <a href={sectionCopy.instagram} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#E1306C] hover:underline">Instagram</a>}
                {sectionCopy.x && <a href={sectionCopy.x} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-800 hover:underline">X</a>}
              </div>
            )}
            <p className="mt-4 text-[11px]" style={{ color: footerTextColor }}>
              Powered by <a href="https://comiu.link" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">COMIU</a>
            </p>
          </footer>
        );
      })()}

      </div>
    </main>
  );
}
