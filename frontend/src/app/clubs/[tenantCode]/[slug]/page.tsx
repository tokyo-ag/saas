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

function renderLine(line: string, index: number, textColor: string) {
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
  return <p key={index} className="text-base leading-8" style={{ color: textColor }}>{line}</p>;
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
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href={clubHref} className="text-sm font-bold text-[#06C755]">
            {tenantName}
          </Link>
          <Link
            href={`/liff/${page.tenant.code ?? tenantCode}`}
            className="rounded-full bg-[#06C755] px-4 py-2 text-xs font-bold text-white"
          >
            参加予約
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#06C755]">COMIU GUIDE</p>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl" style={{ color: textColor }}>{page.title}</h1>
        {page.subtitle && (
          <p className="mt-3 text-lg font-bold leading-8 opacity-75" style={{ color: textColor }}>{page.subtitle}</p>
        )}
        {!page.subtitle && descriptionFromPage(page) && (
          <p className="mt-4 text-base leading-7 opacity-75" style={{ color: textColor }}>{descriptionFromPage(page)}</p>
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
          {page.body.split('\n').map((line, index) => renderLine(line, index, textColor))}
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">{tenantName}</p>
            <p className="mt-1 text-xs text-gray-500">開催中のイベント一覧から参加予約できます。</p>
          </div>
          <Link
            href={clubHref}
            className="inline-flex items-center justify-center rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white"
          >
            イベントを見る
          </Link>
        </div>
      </article>
    </main>
  );
}
