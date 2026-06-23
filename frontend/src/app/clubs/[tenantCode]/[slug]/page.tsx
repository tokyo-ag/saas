import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicCmsPage } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

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
  if (line.startsWith('### ')) {
    return <h3 key={index} className="mt-7 text-xl font-bold" style={{ color: textColor }}>{line.slice(4)}</h3>;
  }
  if (line.startsWith('## ')) {
    return <h2 key={index} className="mt-9 text-2xl font-bold" style={{ color: textColor }}>{line.slice(3)}</h2>;
  }
  if (line.startsWith('# ')) {
    return <h2 key={index} className="mt-9 text-2xl font-bold" style={{ color: textColor }}>{line.slice(2)}</h2>;
  }
  if (line.startsWith('- ')) {
    return <li key={index} className="ml-5 list-disc" style={{ color: textColor }}>{line.slice(2)}</li>;
  }
  if (!line.trim()) {
    return <div key={index} className="h-3" />;
  }
  return <p key={index} className={bodyClassName} style={{ color: textColor }}>{line}</p>;
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
  const image = imgUrl(page.coverImageUrl ?? page.tenant.linePictureUrl, IMAGE_BASE_URL);
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
  const image = imgUrl(page.coverImageUrl ?? page.tenant.linePictureUrl, IMAGE_BASE_URL);
  const clubHref = `/clubs/${page.tenant.code ?? tenantCode}`;
  const textColor = page.textColor || '#111827';
  const accentColor = page.accentColor || '#06C755';
  const fontFamily = fontFamilyMap[page.fontFamily || 'system'] ?? fontFamilyMap.system;
  const titleSizeClass = titleSizeMap[page.titleSize || 'large'] ?? titleSizeMap.large;
  const bodySizeClass = bodySizeMap[page.bodySize || 'base'] ?? bodySizeMap.base;
  const titleAlign = (['left', 'center', 'right'].includes(page.titleAlign || '') ? page.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const layoutVariant = page.layoutVariant || 'one_page';
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

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900" style={{ fontFamily }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href={clubHref} className="text-sm font-bold" style={{ color: accentColor }}>
            {tenantName}
          </Link>
          {layoutVariant === 'hamburger' ? (
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-6 rounded-full bg-gray-500" />
              <span className="h-0.5 w-6 rounded-full bg-gray-500" />
              <span className="h-0.5 w-6 rounded-full bg-gray-500" />
            </span>
          ) : (
            <div className="flex items-center gap-4">
              {layoutVariant === 'one_page' && (
                <div className="hidden gap-4 text-xs font-bold text-gray-400 sm:flex">
                  <span>ブログ</span>
                  <span>予約管理</span>
                </div>
              )}
              <Link
                href={`/liff/${page.tenant.code ?? tenantCode}`}
                className="rounded-full px-4 py-2 text-xs font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                参加予約
              </Link>
            </div>
          )}
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {layoutVariant === 'tabs' && (
          <div className="mb-6 flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full px-4 py-2 text-white" style={{ backgroundColor: accentColor }}>団体説明</span>
            <span className="rounded-full bg-white px-4 py-2 text-gray-500 shadow-sm ring-1 ring-gray-100">ブログ</span>
            <span className="rounded-full bg-white px-4 py-2 text-gray-500 shadow-sm ring-1 ring-gray-100">予約</span>
          </div>
        )}
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: accentColor }}>COMIU GUIDE</p>
        <h1 className={`${titleSizeClass} font-bold leading-tight`} style={{ color: textColor, textAlign: titleAlign }}>{page.title}</h1>
        {page.subtitle && (
          <p className="mt-3 text-lg font-bold leading-8 opacity-75" style={{ color: textColor, textAlign: titleAlign }}>{page.subtitle}</p>
        )}
        {!page.subtitle && descriptionFromPage(page) && (
          <p className="mt-4 text-base leading-7 opacity-75" style={{ color: textColor, textAlign: titleAlign }}>{descriptionFromPage(page)}</p>
        )}

        {image && (
          <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-xl bg-gray-100">
            <Image src={image} alt={page.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          </div>
        )}

        <div className="mt-8 space-y-2 rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-100 md:px-8 md:py-8">
          {page.dividerText && (
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 border-t border-dashed border-gray-300" />
              <span className="text-sm font-bold text-gray-400">{page.dividerText}</span>
              <div className="h-px flex-1 border-t border-dashed border-gray-300" />
            </div>
          )}
          {page.body.split('\n').map((line, index) => renderLine(line, index, textColor, bodySizeClass))}
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">{tenantName}</p>
            <p className="mt-1 text-xs text-gray-500">開催中のイベント一覧から参加予約できます。</p>
          </div>
          <Link
            href={clubHref}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            イベントを見る
          </Link>
        </div>
      </article>
    </main>
  );
}
