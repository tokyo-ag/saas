import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { API_URL, SITE_URL } from '@/lib/config';

export const revalidate = 60;

type OfficialArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  areaTags?: string[];
  targetKeyword?: string | null;
};

async function fetchArticlesByArea(area: string): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120&area=${encodeURIComponent(area)}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area: raw } = await params;
  const area = decodeURIComponent(raw);
  const title = `${area}のサークル・イベント情報`;
  const description = `${area}エリアのサークル・団体・イベントに関する情報をまとめて紹介します。`;
  const url = `${SITE_URL}/guide/area/${encodeURIComponent(area)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | COMIU`, description, url, type: 'website', locale: 'ja_JP' },
  };
}

export default async function GuideAreaHubPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area: raw } = await params;
  const area = decodeURIComponent(raw);
  const articles = await fetchArticlesByArea(area);
  if (articles.length === 0) notFound();

  const hubUrl = `${SITE_URL}/guide/area/${encodeURIComponent(area)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${hubUrl}#webpage`,
        url: hubUrl,
        name: `${area}のサークル・イベント情報`,
        inLanguage: 'ja',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'COMIU', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'ガイド', item: `${SITE_URL}/guide` },
          { '@type': 'ListItem', position: 3, name: area, item: hubUrl },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
            <Link href="/organizers" className="flex items-center gap-2 font-bold">
              <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
              COMIU
            </Link>
            <Link href="/guide" className="ml-auto text-sm font-bold text-gray-500 hover:text-gray-900">記事一覧</Link>
          </div>
        </header>

        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <p className="text-sm font-bold text-[#06C755]">AREA</p>
            <h1 className="mt-3 text-3xl font-bold">{area}のサークル・イベント情報</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">
              {area}エリアのサークル参加・イベント運営に関する記事をまとめて紹介しています。
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.id} href={`/guide/${article.slug}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  {article.category && <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">{article.category}</span>}
                  {(article.areaTags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{tag}</span>
                  ))}
                </div>
                <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-7">{article.title}</h3>
                {article.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-500">{article.excerpt}</p>}
                <p className="mt-5 text-xs font-bold text-gray-400">記事を読む</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
