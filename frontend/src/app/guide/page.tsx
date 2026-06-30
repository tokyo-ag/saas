import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { API_URL, SITE_URL } from '@/lib/config';

export const revalidate = 60;

type OfficialArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  targetKeyword?: string | null;
  publishedAt?: string | null;
};

export const metadata: Metadata = {
  title: 'サークル・イベント運営ガイド',
  description: 'サークル運営、イベント予約管理、新歓集客、LINE活用に関するCOMIU公式記事です。',
  alternates: { canonical: `${SITE_URL}/guide` },
  openGraph: {
    title: 'サークル・イベント運営ガイド | COMIU',
    description: 'サークル運営、イベント予約管理、新歓集客、LINE活用に関するCOMIU公式記事です。',
    url: `${SITE_URL}/guide`,
    type: 'website',
    locale: 'ja_JP',
  },
};

async function fetchArticles(): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function GuidePage() {
  const articles = await fetchArticles();
  const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean))) as string[];
  const guideUrl = `${SITE_URL}/guide`;
  const description = metadata.description as string;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: 'COMIU',
        inLanguage: 'ja',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${guideUrl}#webpage`,
        url: guideUrl,
        name: 'サークル・イベント運営ガイド',
        description,
        inLanguage: 'ja',
        isPartOf: { '@id': `${SITE_URL}#website` },
        mainEntity: { '@id': `${guideUrl}#itemlist` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${guideUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'COMIU', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'ガイド', item: guideUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${guideUrl}#itemlist`,
        name: 'COMIUガイド記事一覧',
        numberOfItems: articles.length,
        itemListElement: articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: article.title,
          url: `${SITE_URL}/guide/${article.slug}`,
        })),
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
          <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-gray-500">
            <Link href="/organizers" className="hover:text-gray-900">主催者向け</Link>
            <Link href="/pricing" className="hover:text-gray-900">料金</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-sm font-bold text-[#06C755]">COMIU GUIDE</p>
          <h1 className="mt-3 text-3xl font-bold">サークル・イベント運営ガイド</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">
            ブログを毎日更新する場所ではなく、検索から主催者に届く記事を丁寧にストックしていく場所です。
          </p>
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category} className="rounded-full bg-[#06C755]/10 px-3 py-1 text-xs font-bold text-[#06C755]">
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {articles.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center text-sm text-gray-400">
            公開中の記事がありません。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.id} href={`/guide/${article.slug}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-2">
                  {article.category && <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">{article.category}</span>}
                  {article.targetKeyword && <span className="truncate text-[11px] text-gray-400">{article.targetKeyword}</span>}
                </div>
                <h2 className="mt-3 line-clamp-2 text-lg font-bold leading-7">{article.title}</h2>
                {article.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-500">{article.excerpt}</p>}
                <p className="mt-5 text-xs font-bold text-gray-400">記事を読む</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
    </>
  );
}
