import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

type Review = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorIconUrl?: string | null;
};

type EventDetail = {
  id: string;
  title: string;
  description?: string;
  heldAt: string;
  endAt?: string | null;
  location: string;
  locationUrl?: string;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  capacity?: number | null;
  reservedCount: number;
  imageUrl?: string;
  iconUrl?: string;
  category?: string | null;
  tags?: string[];
  tenantCode?: string | null;
  tenantName: string;
  tenantIconUrl?: string | null;
  isEnded?: boolean;
  reviews?: Review[];
};

async function fetchEvent(eventId: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/events/${eventId}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function imgSrc(url?: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

function buildJsonLd(event: EventDetail) {
  const priceSpec =
    event.priceMale != null && event.priceFemale != null
      ? [
          { '@type': 'UnitPriceSpecification', price: event.priceMale, priceCurrency: 'JPY', name: '男性' },
          { '@type': 'UnitPriceSpecification', price: event.priceFemale, priceCurrency: 'JPY', name: '女性' },
        ]
      : { '@type': 'UnitPriceSpecification', price: event.price, priceCurrency: 'JPY' };

  const eventUrl = `${SITE_URL}/e/${event.tenantCode}/${event.id}`;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Event',
        name: event.title,
        description: event.description,
        startDate: event.heldAt,
        ...(event.endAt ? { endDate: event.endAt } : {}),
        location: {
          '@type': 'Place',
          name: event.location,
          ...(event.locationUrl ? { url: event.locationUrl } : {}),
        },
        organizer: {
          '@type': 'Organization',
          name: event.tenantName,
          ...(event.tenantCode ? { url: `${SITE_URL}/clubs/${event.tenantCode}` } : {}),
        },
        url: eventUrl,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        offers: {
          '@type': 'Offer',
          price: event.price,
          priceCurrency: 'JPY',
          priceSpecification: priceSpec,
          availability: event.isEnded
            ? 'https://schema.org/SoldOut'
            : event.capacity != null && event.reservedCount >= event.capacity
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
          url: eventUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          ...(event.tenantCode
            ? [{ '@type': 'ListItem', position: 2, name: event.tenantName, item: `${SITE_URL}/clubs/${event.tenantCode}` }]
            : []),
          { '@type': 'ListItem', position: event.tenantCode ? 3 : 2, name: event.title, item: eventUrl },
        ],
      },
    ],
  };

  const eventNode = (ld['@graph'] as Record<string, unknown>[])[0];
  if (imgSrc(event.imageUrl)) eventNode.image = imgSrc(event.imageUrl);

  if (event.reviews && event.reviews.length > 0) {
    eventNode.review = event.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.authorName },
      reviewBody: r.content,
      datePublished: r.createdAt,
    }));
  }

  return ld;
}

export async function generateMetadata({ params }: { params: Promise<{ tenantCode: string; eventId: string }> }): Promise<Metadata> {
  const { tenantCode, eventId } = await params;
  const event = await fetchEvent(eventId);
  if (!event || !event.tenantCode || event.tenantCode !== tenantCode) {
    return { title: 'イベントが見つかりません', robots: { index: false, follow: false } };
  }

  const description = event.description
    ? event.description.slice(0, 150).replace(/\n/g, ' ')
    : `${event.location}で開催。${event.price === 0 ? '参加費無料' : `参加費¥${event.price.toLocaleString()}`}`;

  const ogImage = imgSrc(event.imageUrl) ?? imgSrc(event.iconUrl);
  const hasPastSearchValue = Boolean(
    event.imageUrl ||
      (event.description && event.description.trim().length >= 80) ||
      (event.reviews && event.reviews.length > 0)
  );

  return {
    title: `${event.title} | ${event.tenantName}`,
    description,
    ...(event.isEnded && !hasPastSearchValue ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: `${SITE_URL}/e/${event.tenantCode}/${event.id}`,
    },
    openGraph: {
      title: event.title,
      description,
      url: `${SITE_URL}/e/${event.tenantCode}/${event.id}`,
      locale: 'ja_JP',
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: event.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PublicEventPage({ params }: { params: Promise<{ tenantCode: string; eventId: string }> }) {
  const { tenantCode, eventId } = await params;
  const event = await fetchEvent(eventId);

  if (!event || !event.tenantCode || event.tenantCode !== tenantCode) notFound();

  const liffUrl = `${SITE_URL}/liff/${event.tenantCode}/events/${event.id}`;
  const isFull = event.capacity != null && event.reservedCount >= event.capacity;
  const spotsLeft = event.capacity != null ? event.capacity - event.reservedCount : null;
  const isEnded = event.isEnded ?? false;
  const reviews = event.reviews ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(event)).replace(/</g, '\\u003c') }}
      />

      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-[#06C755] font-bold text-lg tracking-tight">COMIU</Link>
        {!isEnded && (
          <Link href={liffUrl} className="rounded-full bg-[#06C755] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#05a847]">
            LINEで予約
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* 終了バナー */}
        {isEnded && (
          <div className="rounded-2xl bg-gray-100 border border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
            このイベントは終了しました
          </div>
        )}

        {/* バナー画像 */}
        {event.imageUrl && (
          <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
            <Image
              src={imgSrc(event.imageUrl)!}
              alt={event.title}
              fill
              unoptimized
              sizes="(min-width: 768px) 672px, calc(100vw - 32px)"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* タイトル・主催者 */}
        <div>
          {event.category && (
            <span className="inline-block mb-2 rounded-full bg-[#06C755]/10 px-2.5 py-0.5 text-xs font-medium text-[#06C755]">
              {event.category}
            </span>
          )}
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{event.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            {imgSrc(event.tenantIconUrl) && (
              <Image
                src={imgSrc(event.tenantIconUrl)!}
                alt={event.tenantName}
                width={24}
                height={24}
                unoptimized
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <span className="text-sm text-gray-500">{event.tenantName}</span>
          </div>
          {event.tags && event.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 詳細情報 */}
        <div className="rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100 shadow-sm">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div className="text-sm text-gray-800">
              <p>{formatDate(event.heldAt)}</p>
              {event.endAt && <p className="text-gray-500">〜 {formatDate(event.endAt)}</p>}
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div className="text-sm text-gray-800">
              {event.locationUrl ? (
                <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline">{event.location}</a>
              ) : (
                <span>{event.location}</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
              </svg>
            </span>
            <div className="text-sm text-gray-800">
              {event.priceMale != null && event.priceFemale != null ? (
                <p>男性 ¥{event.priceMale.toLocaleString()} / 女性 ¥{event.priceFemale.toLocaleString()}</p>
              ) : (
                <p>{event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`}</p>
              )}
            </div>
          </div>

          {event.capacity != null && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 text-gray-400 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <p className="text-sm text-gray-800">
                {isEnded ? (
                  <span className="text-gray-500">{event.reservedCount}人が参加しました</span>
                ) : isFull ? (
                  <span className="text-red-500 font-medium">満員</span>
                ) : (
                  <span>{event.reservedCount} / {event.capacity}人{spotsLeft != null && spotsLeft <= 5 && <span className="ml-2 text-amber-500 font-medium">残り{spotsLeft}名</span>}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* 説明 */}
        {event.description && (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">イベント詳細</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{event.description}</p>
          </div>
        )}

        {/* 参加者の声 */}
        {reviews.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">参加者の声</h2>
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3">
                {r.authorIconUrl ? (
                  <Image
                    src={r.authorIconUrl}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5 text-xs text-gray-400">
                    {r.authorName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 mb-0.5">{r.authorName}</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {!isEnded ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-5 shadow-sm text-center space-y-3">
            <p className="text-sm text-gray-500">参加にはLINEアカウントが必要です</p>
            <Link
              href={liffUrl}
              className={`block w-full rounded-xl py-3.5 text-sm font-bold text-white transition-colors ${
                isFull ? 'bg-gray-400 pointer-events-none' : 'bg-[#06C755] hover:bg-[#05a847]'
              }`}
            >
              {isFull ? '満員のため受付終了' : 'LINEで予約する'}
            </Link>
            <p className="text-xs text-gray-400">
              このイベントは <a href={SITE_URL} className="text-[#06C755] underline">COMIU</a> で管理されています
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-5 shadow-sm text-center space-y-3">
            <p className="text-sm text-gray-500">他のイベントも探してみましょう</p>
            <a
              href={SITE_URL}
              className="block w-full rounded-xl py-3.5 text-sm font-bold text-[#06C755] border border-[#06C755] transition-colors hover:bg-[#06C755]/5"
            >
              COMIUでイベントを探す
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
