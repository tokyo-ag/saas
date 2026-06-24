import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
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
      .replace(/[#>*_-]/g, '')
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
            <img src={url} alt={alt} className="h-full w-full object-cover" />
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
            <img src={url} alt={alt} className="h-full w-full object-cover" />
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
  const buttonLayoutClass = buttonLayout === 'row1x4' ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-2 gap-3';
  const buttonOpacity = clampPercent(page.buttonOpacity ?? 100);
  const buttonOpacityStyle = { opacity: buttonOpacity / 100 };
  const rawHeroImageMode = page.heroImageMode || 'fixed';
  const heroImageMode = rawHeroImageMode === 'auto'
    ? 'fixed'
    : ['fixed', 'slider', 'grid', 'background'].includes(rawHeroImageMode)
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
    '@type': 'Article',
    headline: page.title,
    description: descriptionFromPage(page),
    datePublished: page.publishedAt,
    dateModified: page.updatedAt,
    author: { '@type': 'Organization', name: tenantName },
    publisher: { '@type': 'Organization', name: tenantName },
    mainEntityOfPage: `${SITE_URL}/clubs/${page.tenant.code ?? tenantCode}/${page.slug}`,
    ...(image ? { image } : {}),
  };

  const contactHref = `/liff/${page.tenant.code ?? tenantCode}/admin-talk`;
  const sectionCopy = (() => {
    try {
      return JSON.parse(page.footerText ?? '{}') as {
        contact?: string;
        contactColor?: string;
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
        blogTitle?: string;
        blogLead?: string;
        blogTitleColor?: string;
        blogLeadColor?: string;
        line?: string;
        instagram?: string;
        x?: string;
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
  const blogSectionTitle = sectionCopy.blogTitle?.trim() || navLabels.blog;
  const blogSectionLead = sectionCopy.blogLead?.trim() || '活動日記やお知らせを表示するエリアです。';
  const blogTitleColor = sectionCopy.blogTitleColor?.trim() || textColor;
  const blogLeadColor = sectionCopy.blogLeadColor?.trim() || '#6B7280';
  const contactSectionTitle = sectionCopy.contactTitle?.trim() || navLabels.contact;
  const contactSectionLead = sectionCopy.contactLead?.trim() || 'ご質問・ご相談はこちらからお気軽にどうぞ。';
  const contactSectionMessage = sectionCopy.contactMessage?.trim() || sectionCopy.contact?.trim() || 'お問い合わせ　WEBサイト内でメッセージが可能です。';
  const contactTitleColor = sectionCopy.contactTitleColor?.trim() || textColor;
  const contactLeadColor = sectionCopy.contactLeadColor?.trim() || '#6B7280';
  const contactMessageColor = sectionCopy.contactMessageColor?.trim() || '#6B7280';

  return (
    <main className="min-h-screen sm:bg-gray-200" style={{ fontFamily, backgroundColor }}>
      <div className="mx-auto w-full max-w-[480px] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl" style={{ backgroundColor, minHeight: '100dvh' }}>
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
                <h1 className="font-bold drop-shadow" style={titleTextStyle}>{tenantName}</h1>
                {page.subtitle && <p style={{ marginTop: subtitleGap, ...subtitleTextStyle }}>{page.subtitle}</p>}
                {heroNavPosition === 'inside' && (
                  <nav className={`mt-4 ${buttonLayoutClass}`}>
                    <a href="#about" className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.about}</a>
                    <a href="#blog" className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.blog}</a>
                    <Link href={reserveHref} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.reserve}</Link>
                    <Link href={contactHref} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.contact}</Link>
                  </nav>
                )}
              </div>
            </div>
          </div>
          {heroNavPosition === 'below' && (
            <nav className={`border-b border-black/5 px-3 pb-3 pt-3 ${buttonLayoutClass}`}>
              <a href="#about" className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.about}</a>
              <a href="#blog" className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.blog}</a>
              <Link href={reserveHref} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.reserve}</Link>
              <Link href={contactHref} className={`flex items-center justify-center px-2 text-center text-sm font-bold transition hover:opacity-80 ${btnClass}`} style={{ ...btnSizeStyle, borderColor: btnBorderColor, color: btnTextColor, ...btnBgStyle, ...btnRadiusStyle, ...btnBoxShadow }}>{navLabels.contact}</Link>
            </nav>
          )}
        </>
      ) : (
        /* 通常モード: 薄いスティッキーヘッダー */
        <header className="sticky top-0 z-10 px-4 py-3" style={{ backgroundColor: navBg }}>
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href={clubHref} className="text-sm font-bold" style={{ color: textColor }}>{tenantName}</Link>
            <div className="flex items-center gap-2 text-xs font-bold">
              <a href="#about" className="hidden sm:block opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}>{navLabels.about}</a>
              <a href="#blog" className="hidden sm:block opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}>{navLabels.blog}</a>
              <a href="#contact" className="hidden sm:block opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}>{navLabels.contact}</a>
              <Link href={reserveHref} className={`px-4 py-2 font-bold text-white ${btnClass}`} style={{ backgroundColor: accentColor, ...buttonOpacityStyle }}>
                {navLabels.reserve}
              </Link>
            </div>
          </div>
        </header>
      )}

      <article id="about" className={`px-4 ${heroImageMode === 'background' ? 'pt-4 pb-8' : 'py-8'}`}>
        {heroImageMode !== 'background' && (
          <HeroImageBlock
            images={images}
            captions={imageCaptions}
            mode={heroImageMode}
            overlayColor={heroOverlayColor}
            overlayOpacity={heroOverlayOpacity}
            alt={page.title}
          />
        )}

        <div className={`rounded-xl px-5 py-6 shadow-sm ring-1 ring-gray-100 md:px-8 md:py-8 ${heroImageMode === 'background' ? '' : 'mt-8'}`} style={{ backgroundColor: navBg }}>
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
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                          <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
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
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
                          <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
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
                        <div className="h-56 w-full overflow-hidden rounded-xl">
                          <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                        </div>
                      )}
                      <div className={`space-y-1 ${blockBodyClass}`} style={{ color: textColor, ...blockTextStyle }}>
                        {block.content.split('\n').map((line: string, j: number) => renderLine(line, j, textColor, blockBodyClass, blockTextStyle))}
                      </div>
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

        <div id="reserve" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold" style={{ color: reserveTitleColor }}>{reserveSectionTitle}</p>
          {reserveSectionLead && (
            <p className="mt-2 text-sm leading-7" style={{ color: reserveLeadColor }}>{reserveSectionLead}</p>
          )}
          <ReservationViewShowcase
            accentColor={accentColor}
            buttonLabel={navLabels.reserve}
            href={reserveHref}
            viewStyle={page.reserveViewStyle}
            events={reserveEvents}
            tenantCode={page.tenant.code ?? tenantCode}
            eventTitleColor={reserveEventTitleColor}
            eventDateColor={reserveEventDateColor}
            eventMetaColor={reserveEventMetaColor}
            className="mt-4"
          />
        </div>

        <section id="blog" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
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
                    className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 transition hover:bg-gray-50">
                    {postImage && <img src={postImage} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
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
        </section>

        <div id="contact" className="mt-6 scroll-mt-6 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold" style={{ color: contactTitleColor }}>{contactSectionTitle}</p>
          {contactSectionLead && (
            <p className="mt-2 text-sm leading-7" style={{ color: contactLeadColor }}>{contactSectionLead}</p>
          )}
          {(() => {
            const contactLink = sectionCopy.contact
              ? sectionCopy.contact.includes('@')
                ? `mailto:${sectionCopy.contact}`
                : /^\d/.test(sectionCopy.contact)
                  ? `tel:${sectionCopy.contact.replace(/[^\d+]/g, '')}`
                  : contactHref
              : contactHref;
            return (
              <Link href={contactLink}
                className="mt-3 inline-flex text-xs font-bold leading-5 transition hover:underline"
                style={{ color: contactMessageColor }}>
                {contactSectionMessage}
              </Link>
            );
          })()}
        </div>
      </article>

      {/* Footer */}
      {(() => {
        const hasSocial = sectionCopy.line || sectionCopy.instagram || sectionCopy.x;
        return (
          <footer className="mt-4 border-t border-gray-100 pb-6 pt-4 text-center">
            {hasSocial && (
              <div className="flex justify-center gap-5">
                {sectionCopy.line && <a href={sectionCopy.line} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#06C755] hover:underline">LINE公式</a>}
                {sectionCopy.instagram && <a href={sectionCopy.instagram} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#E1306C] hover:underline">Instagram</a>}
                {sectionCopy.x && <a href={sectionCopy.x} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-800 hover:underline">X</a>}
              </div>
            )}
            <p className="mt-4 text-[11px] text-gray-400">
              Powered by <a href="https://comiu.link" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">COMIU</a>
            </p>
          </footer>
        );
      })()}

      </div>
    </main>
  );
}
