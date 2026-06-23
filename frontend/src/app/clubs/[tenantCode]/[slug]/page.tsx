import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { PublicCmsPage } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';
import { ReservationViewShowcase } from '@/components/public/ReservationViewShowcase';

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

const titleSizeMap: Record<string, string> = {
  small: 'text-2xl md:text-3xl',
  large: 'text-3xl md:text-4xl',
  xlarge: 'text-4xl md:text-5xl',
};

const bodySizeMap: Record<string, string> = {
  small: 'text-sm leading-7',
  base: 'text-base leading-8',
  large: 'text-lg leading-9',
};

function renderLine(line: string, index: number, textColor: string, bodyClassName: string) {
  if (line.startsWith('### ')) return <h3 key={index} className="mt-7 text-xl font-bold" style={{ color: textColor }}>{line.slice(4)}</h3>;
  if (line.startsWith('## ') || line.startsWith('# ')) return <h2 key={index} className="mt-9 text-2xl font-bold" style={{ color: textColor }}>{line.replace(/^#{1,3}\s/, '')}</h2>;
  if (line.startsWith('- ')) return <li key={index} className="ml-5 list-disc" style={{ color: textColor }}>{line.slice(2)}</li>;
  if (!line.trim()) return <div key={index} className="h-3" />;
  return <p key={index} className={bodyClassName} style={{ color: textColor }}>{line}</p>;
}

function getBtnClass(style: string | null | undefined) {
  switch (style) {
    case 'pill': return 'rounded-full border-2';
    case 'square': return 'rounded-none border-2';
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
  const page = await fetchPage(tenantCode, slug);
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
  const fontFamily = fontFamilyMap[page.fontFamily || 'mincho'] ?? fontFamilyMap.mincho;
  const titleSizeClass = titleSizeMap[page.titleSize || 'large'] ?? titleSizeMap.large;
  const bodySizeClass = bodySizeMap[page.bodySize || 'base'] ?? bodySizeMap.base;
  const titleAlign = (['left', 'center', 'right'].includes(page.titleAlign || '') ? page.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const layoutVariant = page.layoutVariant || 'static';
  const navLabels = {
    about: page.aboutLabel || '団体詳細',
    reserve: page.reserveLabel || '予約する',
    blog: page.blogLabel || 'ブログ',
    contact: page.contactLabel || 'お問い合わせ',
  };
  const buttonStyle = page.buttonStyle ?? 'rounded';
  const buttonLayout = page.buttonLayout === 'row1x4' ? 'row1x4' : 'grid2x2';
  const buttonLayoutClass = buttonLayout === 'row1x4' ? 'grid grid-cols-2 sm:grid-cols-4' : 'grid grid-cols-2';
  const buttonOpacity = clampPercent(page.buttonOpacity ?? 100);
  const buttonOpacityStyle = { opacity: buttonOpacity / 100 };
  const rawHeroImageMode = page.heroImageMode || 'fixed';
  const heroImageMode = rawHeroImageMode === 'auto'
    ? 'fixed'
    : ['fixed', 'slider', 'grid'].includes(rawHeroImageMode)
      ? rawHeroImageMode
      : 'fixed';
  const heroOverlayOpacity = clampPercent(page.heroOverlayOpacity);
  const heroOverlayColor = page.heroOverlayColor || '#000000';
  const gorgeousColor = '#b8860b';
  const btnBorderColor = buttonStyle === 'gorgeous' ? gorgeousColor : accentColor;
  const btnClass = getBtnClass(buttonStyle);

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

  // カテゴリー型
  if (layoutVariant === 'category') {
    const tenantIcon = imgUrl(page.tenant.iconUrl ?? page.tenant.linePictureUrl, IMAGE_BASE_URL);
    return (
      <main className="min-h-screen" style={{ fontFamily, backgroundColor }}>
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
        <div className="flex min-h-screen flex-col items-center px-6 py-16">
          {tenantIcon ? (
            <img src={tenantIcon} alt={tenantName} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: accentColor }}>
              {tenantName.slice(0, 1)}
            </div>
          )}
          <h1 className="mt-4 text-xl font-bold" style={{ color: textColor }}>{tenantName}</h1>
          {page.subtitle && <p className="mt-1 text-sm opacity-70" style={{ color: textColor }}>{page.subtitle}</p>}

          <div className="w-full max-w-sm">
            <HeroImageBlock
              images={images}
              captions={imageCaptions}
              mode={heroImageMode}
              overlayColor={heroOverlayColor}
              overlayOpacity={heroOverlayOpacity}
              alt={page.title}
              className="mt-6 aspect-[16/9]"
            />
          </div>

          <nav className={`mt-10 w-full max-w-lg gap-3 ${buttonLayoutClass}`}>
            <a href="#about" className={`px-5 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor, ...buttonOpacityStyle }}>
              {navLabels.about}
            </a>
            <Link href={reserveHref} className={`px-5 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor, ...buttonOpacityStyle }}>
              {navLabels.reserve}
            </Link>
            <Link href={`/clubs/${page.tenant.code ?? tenantCode}/blog`}
              className={`px-5 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor, ...buttonOpacityStyle }}>
              {navLabels.blog}
            </Link>
            <Link href={contactHref}
              className={`px-5 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor, ...buttonOpacityStyle }}>
              {navLabels.contact}
            </Link>
          </nav>

          {page.body && (
            <div id="about" className="mt-14 w-full max-w-sm scroll-mt-6 rounded-xl px-6 py-5 shadow-sm" style={{ backgroundColor: navColor }}>
              <p className="mb-3 text-sm font-bold" style={{ color: textColor }}>{navLabels.about}</p>
              <div className="text-sm leading-7" style={{ color: textColor }}>
                {page.body.split('\n').map((line, i) => renderLine(line, i, textColor, 'text-sm leading-7'))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // 静止サイト型 (default)
  return (
    <main className="min-h-screen text-gray-900" style={{ fontFamily, backgroundColor }}>
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

      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href={clubHref} className="text-sm font-bold" style={{ color: accentColor }}>{tenantName}</Link>
          <div className="flex items-center gap-2 text-xs font-bold">
            <a href="#about" className="hidden sm:block text-gray-500 hover:text-gray-900">{navLabels.about}</a>
            <a href="#blog" className="hidden sm:block text-gray-500 hover:text-gray-900">{navLabels.blog}</a>
            <a href="#contact" className="hidden sm:block text-gray-500 hover:text-gray-900">{navLabels.contact}</a>
            <Link href={reserveHref} className="rounded-full px-4 py-2 text-white" style={{ backgroundColor: accentColor, ...buttonOpacityStyle }}>
              {navLabels.reserve}
            </Link>
          </div>
        </div>
      </header>

      <article id="about" className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <HeroImageBlock
          images={images}
          captions={imageCaptions}
          mode={heroImageMode}
          overlayColor={heroOverlayColor}
          overlayOpacity={heroOverlayOpacity}
          alt={page.title}
        />

        <div className="mt-8 space-y-2 rounded-xl px-5 py-6 shadow-sm ring-1 ring-gray-100 md:px-8 md:py-8" style={{ backgroundColor: navColor }}>
          {page.body.split('\n').map((line, index) => renderLine(line, index, textColor, bodySizeClass))}
        </div>

        <section id="blog" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold text-gray-900">{navLabels.blog}</p>
          <p className="mt-2 text-sm leading-7 text-gray-500">活動日記やお知らせを表示するエリアです。</p>
        </section>

        <div id="reserve" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold text-gray-900">{navLabels.reserve}</p>
          <ReservationViewShowcase
            accentColor={accentColor}
            buttonLabel={navLabels.reserve}
            href={reserveHref}
            viewStyle={page.reserveViewStyle}
            className="mt-4"
          />
        </div>

        <div id="contact" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold text-gray-900">{navLabels.contact}</p>
          <p className="mt-2 text-sm leading-7 text-gray-500">ご質問・ご相談はこちらからお気軽にどうぞ。</p>
          <Link href={contactHref}
            className="mt-4 inline-block rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-80"
            style={{ backgroundColor: accentColor, ...buttonOpacityStyle }}>
            LINEで問い合わせる
          </Link>
        </div>
      </article>

    </main>
  );
}
