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
  const images = (page.imageUrls?.length ? page.imageUrls : page.coverImageUrl ? [page.coverImageUrl] : [page.tenant.linePictureUrl])
    .map((url) => imgUrl(url, IMAGE_BASE_URL))
    .filter(Boolean) as string[];
  const image = images[0];
  const clubHref = `/clubs/${page.tenant.code ?? tenantCode}`;
  const liffHref = `/liff/${page.tenant.code ?? tenantCode}`;
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
  };
  const buttonStyle = page.buttonStyle ?? 'rounded';
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

  // カテゴリー型
  if (layoutVariant === 'category') {
    const tenantIcon = imgUrl(page.tenant.iconUrl ?? page.tenant.linePictureUrl, IMAGE_BASE_URL);
    return (
      <main className="min-h-screen" style={{ fontFamily, backgroundColor }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
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

          <nav className="mt-10 w-full max-w-xs space-y-4">
            <a href="#about" className={`block w-full px-6 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor }}>
              {navLabels.about}
            </a>
            <Link href={liffHref} className={`block w-full px-6 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor }}>
              {navLabels.reserve}
            </Link>
            <Link href={`/clubs/${page.tenant.code ?? tenantCode}/blog`}
              className={`block w-full px-6 py-4 text-center text-base font-bold transition hover:opacity-80 ${btnClass}`}
              style={{ borderColor: btnBorderColor, color: btnBorderColor }}>
              {navLabels.blog}
            </Link>
          </nav>

          {page.body && (
            <div id="about" className="mt-14 w-full max-w-sm scroll-mt-6 rounded-xl bg-white px-6 py-5 shadow-sm">
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
        @keyframes public-site-slide {
          0%, 28% { transform: translateX(0); }
          34%, 62% { transform: translateX(-100%); }
          68%, 96% { transform: translateX(-200%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {page.headerText && (
        <div className="border-b border-gray-100 px-4 py-2 text-center text-xs font-bold" style={{ backgroundColor: navColor, color: textColor }}>
          {page.headerText}
        </div>
      )}

      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href={clubHref} className="text-sm font-bold" style={{ color: accentColor }}>{tenantName}</Link>
          <div className="flex items-center gap-2 text-xs font-bold">
            <a href="#about" className="hidden sm:block text-gray-500 hover:text-gray-900">{navLabels.about}</a>
            <a href="#blog" className="hidden sm:block text-gray-500 hover:text-gray-900">{navLabels.blog}</a>
            <Link href={liffHref} className="rounded-full px-4 py-2 text-white" style={{ backgroundColor: accentColor }}>
              {navLabels.reserve}
            </Link>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <nav className="mb-6 rounded-xl px-4 py-4" style={{ backgroundColor: navColor }}>
          <p className="mb-3 text-xs font-bold text-gray-400">目次</p>
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <a href="#about" className="rounded-full bg-white px-4 py-2 text-gray-600 shadow-sm">{navLabels.about}</a>
            <a href="#blog" className="rounded-full bg-white px-4 py-2 text-gray-600 shadow-sm">{navLabels.blog}</a>
            <a href="#reserve" className="rounded-full bg-white px-4 py-2 text-gray-600 shadow-sm">{navLabels.reserve}</a>
          </div>
        </nav>

        <h1 id="about" className={`${titleSizeClass} scroll-mt-6 font-bold leading-tight`} style={{ color: textColor, textAlign: titleAlign }}>{page.title}</h1>
        {page.subtitle && (
          <p className="mt-3 text-lg font-bold leading-8 opacity-75" style={{ color: textColor, textAlign: titleAlign }}>{page.subtitle}</p>
        )}

        {images.length > 0 && (
          <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-xl bg-gray-100">
            <div className="flex h-full" style={{ width: `${images.length * 100}%`, animation: images.length >= 2 ? 'public-site-slide 12s infinite' : undefined }}>
              {images.map((url, index) => (
                <img key={`${url}-${index}`} src={url} alt={page.title} className="h-full object-cover" style={{ width: `${100 / images.length}%` }} />
              ))}
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-white/80" />)}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-2 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100 md:px-8 md:py-8">
          {page.body.split('\n').map((line, index) => renderLine(line, index, textColor, bodySizeClass))}
        </div>

        <section id="blog" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold text-gray-900">{navLabels.blog}</p>
          <p className="mt-2 text-sm leading-7 text-gray-500">活動日記やお知らせを表示するエリアです。</p>
        </section>

        <div id="reserve" className="mt-8 scroll-mt-6 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100">
          <p className="text-lg font-bold text-gray-900">{navLabels.reserve}</p>
          <ReservationViewShowcase accentColor={accentColor} buttonLabel={navLabels.reserve} href={liffHref} className="mt-4" />
        </div>
      </article>

      {page.footerText && (
        <footer className="border-t border-gray-100 px-4 py-4 text-center text-xs" style={{ backgroundColor: navColor, color: textColor }}>
          {page.footerText}
        </footer>
      )}
    </main>
  );
}
