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

type OfficialArticleSummary = Omit<OfficialArticle, 'body'>;

async function fetchArticle(slug: string): Promise<OfficialArticle | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles/${slug}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchArticleSummaries(): Promise<OfficialArticleSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
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

function plainMarkdown(text: string) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`>|\\]/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ogImageFor(article: Pick<OfficialArticle, 'ogImageUrl'>) {
  return article.ogImageUrl || `${SITE_URL}/opengraph-image`;
}

function extractFaqItems(body: string) {
  const items: { question: string; answer: string }[] = [];
  const lines = body.split('\n');
  let inFaq = false;
  let current: { question: string; answerLines: string[] } | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const answer = plainMarkdown(current.answerLines.join(' '));
    if (current.question && answer) items.push({ question: current.question, answer });
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+よくある質問/.test(line)) {
      inFaq = true;
      continue;
    }
    if (!inFaq) continue;
    if (line.startsWith('## ')) {
      pushCurrent();
      break;
    }
    if (line.startsWith('### ')) {
      pushCurrent();
      current = { question: plainMarkdown(line.replace(/^###\s+/, '')), answerLines: [] };
      continue;
    }
    if (current && line) current.answerLines.push(line);
  }

  pushCurrent();
  return items.slice(0, 8);
}

function relatedScore(article: OfficialArticleSummary, current: OfficialArticle) {
  if (article.slug === current.slug) return -1;
  let score = 0;
  if (article.category && article.category === current.category) score += 6;
  const haystack = `${article.title} ${article.excerpt ?? ''} ${article.targetKeyword ?? ''}`.toLowerCase();
  const terms = `${current.targetKeyword ?? ''} ${current.title}`
    .toLowerCase()
    .split(/[\s・、。/｜|]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
  for (const term of new Set(terms)) {
    if (haystack.includes(term)) score += 1;
  }
  return score;
}

function pickRelatedArticles(articles: OfficialArticleSummary[], current: OfficialArticle) {
  return articles
    .map((article, index) => ({ article, index, score: relatedScore(article, current) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .map((item) => item.article);
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
  const image = ogImageFor(article);
  return {
    title: article.title,
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
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | COMIU`,
      description,
      images: [image],
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
  const [article, articleSummaries] = await Promise.all([
    fetchArticle(slug),
    fetchArticleSummaries(),
  ]);
  if (!article) notFound();

  const articleUrl = `${SITE_URL}/guide/${slug}`;
  const articleImage = ogImageFor(article);
  const faqItems = extractFaqItems(article.body);
  const relatedArticles = pickRelatedArticles(articleSummaries, article);
  const articleDescription = article.excerpt || cleanDescription(article.body);
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
        '@type': 'WebPage',
        '@id': `${articleUrl}#webpage`,
        url: articleUrl,
        name: article.title,
        description: articleDescription,
        inLanguage: 'ja',
        isPartOf: { '@id': `${SITE_URL}#website` },
        breadcrumb: { '@id': `${articleUrl}#breadcrumb` },
        mainEntity: { '@id': `${articleUrl}#article` },
      },
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: articleDescription,
        image: articleImage,
        datePublished: article.publishedAt ?? undefined,
        dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
        inLanguage: 'ja',
        mainEntityOfPage: { '@id': `${articleUrl}#webpage` },
        articleSection: article.category ?? undefined,
        keywords: article.targetKeyword ?? undefined,
        author: { '@type': 'Organization', name: 'COMIU' },
        publisher: { '@type': 'Organization', name: 'COMIU', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } },
        url: articleUrl,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${articleUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'COMIU', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'ガイド', item: `${SITE_URL}/guide` },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
      ...(faqItems.length > 0 ? [{
        '@type': 'FAQPage',
        '@id': `${articleUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }] : []),
    ],
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

          {relatedArticles.length > 0 && (
            <section className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-950">関連する記事</h2>
              <div className="mt-4 grid gap-3">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/guide/${related.slug}`}
                    className="rounded-lg border border-gray-100 p-4 transition hover:border-[#06C755]/40 hover:bg-[#06C755]/5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {related.category && <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">{related.category}</span>}
                      {related.targetKeyword && <span className="text-[11px] text-gray-400">{related.targetKeyword}</span>}
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 text-gray-950">{related.title}</p>
                    {related.excerpt && <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{related.excerpt}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </>
  );
}
