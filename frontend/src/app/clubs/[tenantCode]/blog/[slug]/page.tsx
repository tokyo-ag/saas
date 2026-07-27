import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL, SITE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import type { BlogPost, BlogPostSummary, LiffEvent } from '@/lib/api';
import { EventCardMini, RelatedArticleCard, buildOfficialRelated, type OfficialArticle, type RelatedArticle } from '@/app/guide/_hub/hubPage';

export const revalidate = 60;

async function fetchPost(tenantCode: string, slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog/${slug}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const RELATED_LIMIT = 6;

async function fetchSameTenantPosts(tenantCode: string, excludeId: string): Promise<BlogPostSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog`, { next: { revalidate } });
    if (!res.ok) return [];
    const posts: BlogPostSummary[] = await res.json();
    return posts.filter((p) => p.id !== excludeId).slice(0, RELATED_LIMIT);
  } catch {
    return [];
  }
}

async function fetchOfficialArticles(): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=${RELATED_LIMIT}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchTenantHome(tenantCode: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, { next: { revalidate } });
    if (!res.ok) return `/clubs/${tenantCode}`;
    const tenant: { pages?: Array<{ slug: string }> } = await res.json();
    const primarySlug = tenant.pages?.[0]?.slug;
    return primarySlug ? `/clubs/${tenantCode}/${primarySlug}` : `/clubs/${tenantCode}`;
  } catch {
    return `/clubs/${tenantCode}`;
  }
}

async function fetchUpcomingEvents(tenantCode: string): Promise<LiffEvent[]> {
  try {
    const res = await fetch(`${API_URL}/api/liff/${tenantCode}/events`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function firstImageFromBody(body: string): string | null {
  const match = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match?.[1] ?? null;
}

// The one image a post can have is promoted to the eyecatch slot at the top of the article,
// so it's dropped from its original spot in the body to avoid showing it twice.
function stripFirstImageLine(body: string): string {
  return body
    .split('\n')
    .filter((line) => !IMAGE_RE.test(line.trim()))
    .join('\n');
}

function cleanDescription(text: string): string {
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
  params: Promise<{ tenantCode: string; slug: string }>;
}): Promise<Metadata> {
  const { tenantCode, slug } = await params;
  const post = await fetchPost(tenantCode, slug);
  if (!post) return {};
  const tenantName = post.tenant?.lineDisplayName ?? post.tenant?.name ?? tenantCode;
  const description = post.excerpt ?? cleanDescription(post.body);
  const image =
    firstImageFromBody(post.body) ??
    imgUrl(post.tenant?.linePictureUrl ?? post.tenant?.iconUrl, IMAGE_BASE_URL) ??
    `${SITE_URL}/opengraph-image`;
  return {
    title: `${post.title} | ${tenantName}`,
    description,
    alternates: { canonical: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}` },
    openGraph: {
      title: `${post.title} | ${tenantName}`,
      description,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      url: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}`,
      locale: 'ja_JP',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | ${tenantName}`,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function linkifyText(text: string, keyPrefix: string) {
  const parts = text.split(/(https?:\/\/[^\s\])}"'」』]+)/g);
  return parts.flatMap((part, i) => {
    if (!/^https?:\/\//.test(part)) return [part];
    const m = part.match(/^(.*?)([.,!?！?。、]*)$/);
    const url = m ? m[1] : part;
    const trailing = m ? m[2] : '';
    return [
      <a key={`${keyPrefix}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="underline">{url}</a>,
      trailing,
    ];
  });
}

// AIが生成した原稿にありがちな「**太字**」を見出し/強調として解釈できるようにする
function renderInline(text: string, keyPrefix: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.flatMap((seg, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(seg);
    if (m) return <strong key={`${keyPrefix}-b-${i}`}>{linkifyText(m[1], `${keyPrefix}-b-${i}`)}</strong>;
    return linkifyText(seg, `${keyPrefix}-${i}`);
  });
}

const HEADING_LINE_RE = /^(#{1,6})\s+(.+)$/;
const BOLD_ONLY_LINE_RE = /^\*\*([^*]+)\*\*$/;

function BodyRenderer({ body }: { body: string }) {
  const parts = body.split('\n');
  return (
    <div className="space-y-2 text-sm leading-8 text-gray-700">
      {parts.map((line, i) => {
        const trimmed = line.trim();
        const img = IMAGE_RE.exec(trimmed);
        if (img) {
          return (
            <div key={i} className="relative my-2 w-full overflow-hidden rounded-lg" style={{ minHeight: 200 }}>
              <Image
                src={img[2]}
                alt={img[1]}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 640px"
              />
            </div>
          );
        }

        const heading = HEADING_LINE_RE.exec(trimmed);
        if (heading) {
          const level = heading[1].length;
          const content = renderInline(heading[2], `h-${i}`);
          return level <= 2
            ? <h2 key={i} className="mt-6 text-lg font-bold text-gray-950">{content}</h2>
            : <h3 key={i} className="mt-4 text-base font-bold text-gray-950">{content}</h3>;
        }

        const boldOnly = BOLD_ONLY_LINE_RE.exec(trimmed);
        if (boldOnly) {
          return <h2 key={i} className="mt-6 text-lg font-bold text-gray-950">{linkifyText(boldOnly[1], `h-${i}`)}</h2>;
        }

        return line ? <p key={i}>{renderInline(line, `line-${i}`)}</p> : <br key={i} />;
      })}
    </div>
  );
}

function RelatedArticleSection({ heading, items }: { heading: string; items: RelatedArticle[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-950">{heading}</h2>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function UpcomingEventsSection({ tenantCode, tenantName, events }: { tenantCode: string; tenantName: string; events: LiffEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-950">{`すぐ参加できる${tenantName}の活動`}</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <EventCardMini key={event.id} event={{ ...event, tenantCode }} />
        ))}
      </div>
    </section>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ tenantCode: string; slug: string }>;
}) {
  const { tenantCode, slug } = await params;
  const post = await fetchPost(tenantCode, slug);
  if (!post) notFound();

  const tenantName = post.tenant?.lineDisplayName ?? post.tenant?.name ?? tenantCode;
  const description = post.excerpt ?? cleanDescription(post.body);
  const eyecatchImage =
    firstImageFromBody(post.body) ??
    imgUrl(post.tenant?.linePictureUrl ?? post.tenant?.iconUrl, IMAGE_BASE_URL) ??
    DEFAULT_EVENT_IMAGE;
  const bodyWithoutEyecatch = stripFirstImageLine(post.body);

  const [sameTenantPosts, officialArticles, tenantHomeHref, upcomingEvents] = await Promise.all([
    fetchSameTenantPosts(tenantCode, post.id),
    fetchOfficialArticles(),
    fetchTenantHome(tenantCode),
    fetchUpcomingEvents(tenantCode),
  ]);
  const sameTenantItems: RelatedArticle[] = sameTenantPosts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    imageUrl: p.coverImageUrl ?? null,
    href: `/clubs/${tenantCode}/blog/${p.slug}`,
    matchesBoth: false,
    publishedAt: p.publishedAt ?? null,
  }));
  const comiuRelatedItems: RelatedArticle[] = buildOfficialRelated(officialArticles, '', '', RELATED_LIMIT);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: tenantName },
    publisher: { '@type': 'Organization', name: tenantName },
    url: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="min-h-screen bg-[#F7F8FA] pb-32">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/clubs/${tenantCode}/blog`} className="text-sm text-[#06C755] hover:underline">
              ← ブログ一覧
            </Link>
          </div>
          <article className="rounded-xl border border-gray-200 bg-white px-6 py-8">
            <Link href={tenantHomeHref} className="mb-3 inline-block text-sm font-bold text-[#06C755] hover:underline">
              {tenantName}
            </Link>
            <p className="mb-2 text-xs text-gray-400">{formatDate(post.publishedAt)}</p>
            <h1 className="mb-3 text-2xl font-bold leading-tight text-gray-900">{post.title}</h1>
            <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100">
              <Image src={eyecatchImage} alt={post.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
            </div>
            <BodyRenderer body={bodyWithoutEyecatch} />
          </article>

          {upcomingEvents.length > 0 && <hr className="my-8 border-gray-200" />}
          <UpcomingEventsSection tenantCode={tenantCode} tenantName={tenantName} events={upcomingEvents} />

          {sameTenantItems.length > 0 && <hr className="my-8 border-gray-200" />}
          <RelatedArticleSection heading={`${tenantName}の関連記事`} items={sameTenantItems} />

          {comiuRelatedItems.length > 0 && <hr className="my-8 border-gray-200" />}
          <RelatedArticleSection heading="COMIUおすすめ記事" items={comiuRelatedItems} />

          <div className="mt-8 text-center">
            <Link
              href={`/clubs/${tenantCode}/blog`}
              className="inline-block rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              ← 一覧に戻る
            </Link>
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Link
            href={tenantHomeHref}
            className="block rounded-full bg-[#06C755] px-8 py-4 text-center text-base font-bold text-white hover:bg-[#05a847]"
          >
            {tenantName}の団体ページを見る
          </Link>
        </div>
      </div>
    </>
  );
}
