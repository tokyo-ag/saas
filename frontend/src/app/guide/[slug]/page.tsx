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
  body: string;
  category?: string | null;
  targetKeyword?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ogImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

async function fetchArticle(slug: string): Promise<OfficialArticle | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles/${slug}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function cleanDescription(text: string) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`>|\\]/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return {};
  const description = article.excerpt || cleanDescription(article.body);
  return {
    title: `${article.title} | COMIU`,
    description,
    alternates: { canonical: `${SITE_URL}/guide/${slug}` },
    openGraph: {
      title: `${article.title} | COMIU`,
      description,
      type: 'article',
      url: `${SITE_URL}/guide/${slug}`,
      locale: 'ja_JP',
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt ?? undefined,
      ...(article.ogImageUrl ? { images: [{ url: article.ogImageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: article.ogImageUrl ? 'summary_large_image' : 'summary',
      title: `${article.title} | COMIU`,
      description,
      ...(article.ogImageUrl ? { images: [article.ogImageUrl] } : {}),
    },
  };
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function BodyRenderer({ body }: { body: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-8 text-gray-700">
      {body.split('\n').map((raw, index) => {
        const line = raw.trim();
        const image = IMAGE_RE.exec(line);
        if (image) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={index} src={image[2]} alt={image[1]} className="my-6 w-full rounded-xl border border-gray-100 object-cover" />
          );
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="pt-4 text-lg font-bold text-gray-950">{line.replace(/^### /, '')}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="pt-6 text-2xl font-bold text-gray-950">{line.replace(/^## /, '')}</h2>;
        }
        if (line.startsWith('- ')) {
          return <p key={index} className="rounded-lg bg-gray-50 px-4 py-3 text-sm">{line.replace(/^- /, '')}</p>;
        }
        if (!line) return <div key={index} className="h-2" />;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || cleanDescription(article.body),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: 'COMIU' },
    publisher: { '@type': 'Organization', name: 'COMIU', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } },
    url: `${SITE_URL}/guide/${slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-4">
            <Link href="/organizers" className="flex items-center gap-2 font-bold">
              <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
              COMIU
            </Link>
            <Link href="/guide" className="ml-auto text-sm font-bold text-gray-500 hover:text-gray-900">記事一覧</Link>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-5 py-10">
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-9">
            <div className="flex flex-wrap items-center gap-2">
              {article.category && <span className="rounded-full bg-[#06C755]/10 px-3 py-1 text-xs font-bold text-[#06C755]">{article.category}</span>}
              {article.targetKeyword && <span className="text-xs text-gray-400">{article.targetKeyword}</span>}
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-gray-950">{article.title}</h1>
            {article.excerpt && <p className="mt-4 text-sm leading-7 text-gray-500">{article.excerpt}</p>}
            <div className="my-8 h-px bg-gray-100" />
            <BodyRenderer body={article.body} />
          </div>

          <div className="mt-6 rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
            <p className="text-sm font-bold text-gray-950">COMIUで主催者向けWEBサイトと予約管理をまとめる</p>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              団体紹介、記事導線、予約画面、参加者管理をひとつにつなげられます。
            </p>
            <Link href={article.ctaHref || '/organizers'} className="mt-4 inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white hover:opacity-90">
              {article.ctaLabel || 'COMIUを見る'}
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
