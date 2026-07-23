import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL, SITE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import type { BlogPost, BlogPostSummary, LiffEvent, PortalBlogPost } from '@/lib/api';

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

async function fetchRelatedByTags(tags: string[], excludeTenantCode: string, excludeId: string): Promise<PortalBlogPost[]> {
  if (tags.length === 0) return [];
  try {
    const res = await fetch(
      `${API_URL}/api/public/blog?tags=${encodeURIComponent(tags.join(','))}&limit=30`,
      { next: { revalidate } },
    );
    if (!res.ok) return [];
    const posts: PortalBlogPost[] = await res.json();
    return posts
      .filter((p) => p.id !== excludeId && p.tenant.code !== excludeTenantCode)
      .slice(0, RELATED_LIMIT);
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

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' });
}

function eventPriceLabel(event: LiffEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `男性${event.priceMale.toLocaleString()}円／女性${event.priceFemale.toLocaleString()}円`;
  }
  return event.price === 0 ? '無料' : `${event.price.toLocaleString()}円`;
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

function BodyRenderer({ body }: { body: string }) {
  const parts = body.split('\n');
  return (
    <div className="space-y-2 text-sm leading-8 text-gray-700">
      {parts.map((line, i) => {
        const m = IMAGE_RE.exec(line.trim());
        if (m) {
          return (
            <div key={i} className="relative my-2 w-full overflow-hidden rounded-lg" style={{ minHeight: 200 }}>
              <Image
                src={m[2]}
                alt={m[1]}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 640px"
              />
            </div>
          );
        }
        return line ? <p key={i}>{linkifyText(line, `line-${i}`)}</p> : <br key={i} />;
      })}
    </div>
  );
}

type RelatedItem = {
  key: string;
  href: string;
  title: string;
  subtitle?: string | null;
  image: string;
};

function RelatedPostSlider({ heading, items }: { heading: string; items: RelatedItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold text-gray-900">{heading}</h2>
      <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="block shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ width: '220px' }}
            >
              <div className="relative aspect-[16/9] w-full bg-gray-100">
                <Image src={item.image} alt={item.title} fill className="object-cover" sizes="220px" />
              </div>
              <div className="space-y-1 p-3">
                {item.subtitle && <p className="truncate text-[11px] text-gray-400">{item.subtitle}</p>}
                <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-800">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsScroll({ tenantCode, events }: { tenantCode: string; events: LiffEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold text-gray-900">今後のイベント</h2>
      <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {events.map((event) => {
            const image = imgUrl(event.imageUrl, API_URL) ?? DEFAULT_EVENT_IMAGE;
            return (
              <Link
                key={event.id}
                href={`/e/${tenantCode}/${event.id}`}
                className="block shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ width: '220px' }}
              >
                <div className="relative aspect-[16/9] w-full bg-gray-100">
                  <Image src={image} alt={event.title} fill className="object-cover" sizes="220px" />
                </div>
                <div className="space-y-1 p-3">
                  <p className="text-[11px] text-gray-400">{formatEventDate(event.heldAt)}</p>
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-800">{event.title}</p>
                  <p className="text-[11px] text-gray-500">{eventPriceLabel(event)}</p>
                </div>
              </Link>
            );
          })}
        </div>
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

  const [sameTenantPosts, comiuRelatedPosts, tenantHomeHref, upcomingEvents] = await Promise.all([
    fetchSameTenantPosts(tenantCode, post.id),
    fetchRelatedByTags(post.tags ?? [], tenantCode, post.id),
    fetchTenantHome(tenantCode),
    fetchUpcomingEvents(tenantCode),
  ]);
  const sameTenantItems: RelatedItem[] = sameTenantPosts.map((p) => ({
    key: p.id,
    href: `/clubs/${tenantCode}/blog/${p.slug}`,
    title: p.title,
    image: imgUrl(p.coverImageUrl, IMAGE_BASE_URL) ?? DEFAULT_EVENT_IMAGE,
  }));
  const comiuRelatedItems: RelatedItem[] = comiuRelatedPosts.map((p) => ({
    key: p.id,
    href: `/clubs/${p.tenant.code}/blog/${p.slug}`,
    title: p.title,
    subtitle: p.tenant.lineDisplayName ?? p.tenant.name,
    image: imgUrl(p.coverImageUrl, IMAGE_BASE_URL) ?? DEFAULT_EVENT_IMAGE,
  }));

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
      <main className="min-h-screen bg-[#F7F8FA] pb-24">
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

          {sameTenantItems.length > 0 && <hr className="my-8 border-gray-200" />}
          <RelatedPostSlider heading={`${tenantName}の関連記事`} items={sameTenantItems} />

          {upcomingEvents.length > 0 && <hr className="my-8 border-gray-200" />}
          <UpcomingEventsScroll tenantCode={tenantCode} events={upcomingEvents} />

          {comiuRelatedItems.length > 0 && <hr className="my-8 border-gray-200" />}
          <RelatedPostSlider heading="COMIUおすすめ記事" items={comiuRelatedItems} />

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
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Link
            href={tenantHomeHref}
            className="block rounded-full bg-[#06C755] px-6 py-3 text-center text-sm font-bold text-white hover:bg-[#05a847]"
          >
            {tenantName}の団体ページを見る
          </Link>
        </div>
      </div>
    </>
  );
}
