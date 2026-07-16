import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { API_URL, SITE_URL } from '@/lib/config';
import { ACTIVITY_TAG_EVENT_CATEGORY } from '@/lib/lpTags';

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

type PublicCircle = {
  id: string;
  code: string | null;
  name: string;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
};

type PublicEvent = {
  id: string;
  tenantCode?: string | null;
  title: string;
  heldAt: string;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  imageUrl?: string | null;
};

async function fetchArticlesByCategory(category: string): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120&category=${encodeURIComponent(category)}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchCircles(category: string, area?: string): Promise<PublicCircle[]> {
  try {
    const params = new URLSearchParams({ activityTag: category });
    if (area) params.set('area', area);
    const res = await fetch(`${API_URL}/api/public/tenants?${params.toString()}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchEvents(category: string, area?: string): Promise<PublicEvent[]> {
  const eventCategory = ACTIVITY_TAG_EVENT_CATEGORY[category];
  if (!eventCategory) return [];
  try {
    const params = new URLSearchParams({ category: eventCategory });
    if (area) params.set('tag', area);
    const res = await fetch(`${API_URL}/api/public/events?${params.toString()}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function imgSrc(url: string | null | undefined) {
  if (!url) return '/defaults/events/default.webp';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

function eventPriceLabel(event: PublicEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `¥${Math.min(event.priceMale, event.priceFemale).toLocaleString()}〜`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function eventDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function EventCardMini({ event }: { event: PublicEvent }) {
  const href = event.tenantCode ? `/e/${event.tenantCode}/${event.id}` : '/';
  return (
    <Link href={href} className="relative w-28 shrink-0 overflow-hidden rounded-xl bg-white" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc(event.imageUrl)} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <p className="mb-1 line-clamp-2 text-[11px] font-bold leading-snug text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{event.title}</p>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[9px] text-white/80">{eventDateLabel(event.heldAt)}</span>
            <span className="shrink-0 text-[9px] font-semibold text-white/95">{eventPriceLabel(event)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ area?: string }>;
}): Promise<Metadata> {
  const { category: raw } = await params;
  const { area } = await searchParams;
  const category = decodeURIComponent(raw);
  const title = area ? `${area}の${category}サークル・団体一覧` : `${category}のサークル・イベント情報`;
  const description = area
    ? `${area}で活動している${category}のサークル・団体をCOMIUからまとめて紹介します。`
    : `${category}のサークル・団体・イベントに関する情報とCOMIU掲載団体をまとめて紹介します。`;
  const url = area
    ? `${SITE_URL}/guide/tag/${encodeURIComponent(category)}?area=${encodeURIComponent(area)}`
    : `${SITE_URL}/guide/tag/${encodeURIComponent(category)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | COMIU`, description, url, type: 'website', locale: 'ja_JP' },
  };
}

export default async function GuideCategoryHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ area?: string }>;
}) {
  const { category: raw } = await params;
  const { area } = await searchParams;
  const category = decodeURIComponent(raw);
  const [articles, circles, events] = await Promise.all([
    fetchArticlesByCategory(category),
    fetchCircles(category, area),
    fetchEvents(category, area),
  ]);
  if (articles.length === 0 && circles.length === 0 && events.length === 0) notFound();

  const hubUrl = `${SITE_URL}/guide/tag/${encodeURIComponent(category)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${hubUrl}#webpage`,
        url: hubUrl,
        name: `${category}のサークル・イベント情報`,
        inLanguage: 'ja',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'COMIU', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'ガイド', item: `${SITE_URL}/guide` },
          { '@type': 'ListItem', position: 3, name: category, item: hubUrl },
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
            <p className="text-sm font-bold text-[#06C755]">CATEGORY</p>
            <h1 className="mt-3 text-3xl font-bold">
              {area ? `${area}の${category}サークル・団体一覧` : `${category}のサークル・イベント情報`}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">
              {area
                ? `${area}で活動している${category}の記事と、COMIUに実際に登録されている団体をまとめて紹介しています。`
                : `${category}に関する記事と、COMIUに実際に登録されている団体をまとめて紹介しています。`}
            </p>
          </div>
        </section>

        {circles.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-8">
            <h2 className="text-lg font-bold text-gray-950">{area ? `${area}の${category}の団体` : `${category}の団体`}</h2>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {circles.map((circle) => {
                const displayName = circle.lineDisplayName ?? circle.name;
                const href = circle.code ? `/clubs/${circle.code}` : `/liff/${circle.id}`;
                return (
                  <Link
                    key={circle.id}
                    href={href}
                    className="flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl bg-white p-3"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                  >
                    {circle.linePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={circle.linePictureUrl} alt={displayName} className="h-14 w-14 rounded-full border-2 border-gray-100 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#06C755] to-[#047a35]">
                        <span className="text-lg font-bold text-white">{displayName.slice(0, 1)}</span>
                      </div>
                    )}
                    <p className="line-clamp-2 text-center text-[12px] font-semibold leading-snug text-gray-800">{displayName}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-8">
            <h2 className="text-lg font-bold text-gray-950">{area ? `${area}の${category}サークル` : `${category}のサークル`}</h2>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {events.map((event) => <EventCardMini key={event.id} event={event} />)}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-5 py-8">
          <h2 className="text-lg font-bold text-gray-950">{category}の記事</h2>
          {articles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-14 text-center text-sm text-gray-400">
              このカテゴリの記事はまだありません。
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <Link key={article.id} href={`/guide/${article.slug}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-2">
                    {article.category && <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">{article.category}</span>}
                    {(article.areaTags ?? []).map((area) => (
                      <span key={area} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{area}</span>
                    ))}
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-7">{article.title}</h3>
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
