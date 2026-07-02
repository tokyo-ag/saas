import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import PublicFooter from '@/components/public/PublicFooter';
import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

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
  locationUrl?: string | null;
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
    const res = await fetch(`${API_URL}/api/public/events/${eventId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function imgSrc(url?: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${IMAGE_BASE_URL}${url}` : url;
}

function priceText(event: EventDetail) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `男性 ¥${event.priceMale.toLocaleString()} / 女性 ¥${event.priceFemale.toLocaleString()}`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function offerPrice(event: EventDetail) {
  if (event.priceMale != null && event.priceFemale != null) {
    return Math.min(event.priceMale, event.priceFemale);
  }
  return event.price;
}

function validEndAt(event: EventDetail) {
  if (!event.endAt) return null;
  const heldAtMs = new Date(event.heldAt).getTime();
  const endAtMs = new Date(event.endAt).getTime();
  if (Number.isNaN(heldAtMs) || Number.isNaN(endAtMs) || endAtMs <= heldAtMs) {
    return null;
  }
  return event.endAt;
}

function tagHref(tag: string) {
  const links: Record<string, string> = {
    交流会: '/events/meetup',
    バドミントン: '/sports/badminton',
    バスケ: '/sports/basketball',
    フットサル: '/sports/futsal',
    バレー: '/sports/volleyball',
  };
  return links[tag] ?? null;
}

function buildDescription(event: EventDetail) {
  if (event.description && event.description.trim()) {
    return event.description.trim().slice(0, 150).replace(/\n/g, ' ');
  }
  return `${event.location}で開催。参加費は${priceText(event)}。COMIUでイベント詳細を確認できます。`;
}

function buildJsonLd(event: EventDetail) {
  const priceSpec =
    event.priceMale != null && event.priceFemale != null
      ? [
          {
            '@type': 'UnitPriceSpecification',
            price: event.priceMale,
            priceCurrency: 'JPY',
            name: '男性',
          },
          {
            '@type': 'UnitPriceSpecification',
            price: event.priceFemale,
            priceCurrency: 'JPY',
            name: '女性',
          },
        ]
      : {
          '@type': 'UnitPriceSpecification',
          price: event.price,
          priceCurrency: 'JPY',
        };

  const eventUrl = `${SITE_URL}/e/${event.tenantCode}/${event.id}`;
  const image = imgSrc(event.imageUrl) ?? imgSrc(event.iconUrl) ?? undefined;
  const endAt = validEndAt(event);
  const inventoryLevel =
    event.capacity != null
      ? Math.max(event.capacity - event.reservedCount, 0)
      : undefined;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Event',
        name: event.title,
        description: buildDescription(event),
        startDate: event.heldAt,
        ...(endAt ? { endDate: endAt } : {}),
        ...(image ? { image: [image] } : {}),
        location: {
          '@type': 'Place',
          name: event.location,
          ...(event.locationUrl ? { url: event.locationUrl } : {}),
        },
        organizer: {
          '@type': 'Organization',
          name: event.tenantName,
          ...(event.tenantCode
            ? { url: `${SITE_URL}/clubs/${event.tenantCode}` }
            : {}),
        },
        url: eventUrl,
        eventStatus: event.isEnded
          ? 'https://schema.org/EventCompleted'
          : 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        offers: {
          '@type': 'Offer',
          price: offerPrice(event),
          priceCurrency: 'JPY',
          priceSpecification: priceSpec,
          availability: event.isEnded
            ? 'https://schema.org/SoldOut'
            : event.capacity != null && event.reservedCount >= event.capacity
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
          ...(inventoryLevel !== undefined
            ? {
                inventoryLevel: {
                  '@type': 'QuantitativeValue',
                  value: inventoryLevel,
                },
              }
            : {}),
          url: eventUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          ...(event.tenantCode
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: event.tenantName,
                  item: `${SITE_URL}/clubs/${event.tenantCode}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: event.tenantCode ? 3 : 2,
            name: event.title,
            item: eventUrl,
          },
        ],
      },
    ],
  };

  const eventNode = (ld['@graph'] as Record<string, unknown>[])[0];

  if (event.reviews && event.reviews.length > 0) {
    eventNode.review = event.reviews.slice(0, 5).map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.authorName },
      reviewBody: review.content,
      datePublished: review.createdAt,
    }));
  }

  return ld;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string; eventId: string }>;
}): Promise<Metadata> {
  const { tenantCode, eventId } = await params;
  const event = await fetchEvent(eventId);
  if (!event || !event.tenantCode || event.tenantCode !== tenantCode) {
    return {
      title: 'イベントが見つかりません',
      robots: { index: false, follow: false },
    };
  }

  const description = buildDescription(event);
  const ogImage = imgSrc(event.imageUrl) ?? imgSrc(event.iconUrl);
  const hasPastSearchValue = Boolean(
    event.imageUrl ||
      (event.description && event.description.trim().length >= 80) ||
      (event.reviews && event.reviews.length > 0),
  );

  return {
    title: `${event.title} | ${event.tenantName}`,
    description,
    ...(event.isEnded && !hasPastSearchValue
      ? { robots: { index: false, follow: true } }
      : {}),
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

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ tenantCode: string; eventId: string }>;
}) {
  const { tenantCode, eventId } = await params;
  const event = await fetchEvent(eventId);

  if (!event || !event.tenantCode || event.tenantCode !== tenantCode) notFound();

  const reserveUrl = `/liff/${event.tenantCode}/events/${event.id}/reserve`;
  const isFull =
    event.capacity != null && event.reservedCount >= event.capacity;
  const spotsLeft =
    event.capacity != null ? event.capacity - event.reservedCount : null;
  const isEnded = event.isEnded ?? false;
  const reviews = event.reviews ?? [];
  const endAt = validEndAt(event);

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(event)).replace(/</g, '\\u003c'),
        }}
      />

      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-[#06C755] font-bold text-lg tracking-tight">
          COMIU
        </Link>
        {!isEnded && (
          <Link
            href={reserveUrl}
            className="rounded-full bg-[#06C755] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#05a847]"
          >
            LINEで予約
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10 space-y-5">
        {isEnded && (
          <div className="mx-auto max-w-3xl rounded-2xl bg-gray-100 border border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
            このイベントは終了しました
          </div>
        )}

        <section className={`rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5 ${event.imageUrl ? 'md:grid md:grid-cols-[minmax(280px,42%)_1fr] md:gap-6' : 'mx-auto max-w-3xl'}`}>
          {event.imageUrl && (
            <div className="relative mb-4 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 md:mb-0">
              <Image
                src={imgSrc(event.imageUrl)!}
                alt={event.title}
                fill
                sizes="(min-width: 768px) 420px, calc(100vw - 48px)"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="min-w-0">
            <div>
              {event.category && (
                <span className="inline-block mb-2 rounded-full bg-[#06C755]/10 px-2.5 py-0.5 text-xs font-medium text-[#06C755]">
                  {event.category}
                </span>
              )}
              <h1 className="text-xl font-bold text-gray-900 leading-snug md:text-2xl">
                {event.title}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                {imgSrc(event.tenantIconUrl) && (
                  <Image
                    src={imgSrc(event.tenantIconUrl)!}
                    alt={event.tenantName}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <Link
                  href={`/clubs/${event.tenantCode}`}
                  className="text-sm text-gray-500 hover:text-[#06C755]"
                >
                  {event.tenantName}
                </Link>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => {
                    const href = tagHref(tag);
                    const className =
                      'rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600 hover:border-[#06C755] hover:text-[#06C755]';
                    return href ? (
                      <Link key={tag} href={href} className={className}>
                        {tag}
                      </Link>
                    ) : (
                      <span key={tag} className={className}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl bg-gray-50 p-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-gray-400">日</span>
                <div>
                  <p className="text-xs font-semibold text-gray-400">日時</p>
                  <p className="text-gray-800">{formatDate(event.heldAt)}</p>
                  {endAt && <p className="text-gray-500">終了 {formatDate(endAt)}</p>}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-gray-400">場</span>
                <div>
                  <p className="text-xs font-semibold text-gray-400">場所</p>
                  <div className="text-gray-800">
                    {event.locationUrl ? (
                      <a
                        href={event.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#06C755] underline"
                      >
                        {event.location}
                      </a>
                    ) : (
                      <span>{event.location}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-gray-400">円</span>
                <div>
                  <p className="text-xs font-semibold text-gray-400">参加費</p>
                  <p className="font-semibold text-gray-900">{priceText(event)}</p>
                </div>
              </div>

              {event.capacity != null && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-gray-400">人</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-400">定員</p>
                    <p className="text-gray-800">
                      {isEnded ? (
                        <span className="text-gray-500">
                          {event.reservedCount}人が参加しました
                        </span>
                      ) : isFull ? (
                        <span className="font-medium text-red-500">満席</span>
                      ) : (
                        <span>
                          {event.reservedCount} / {event.capacity}人
                          {spotsLeft != null && spotsLeft <= 5 && (
                            <span className="ml-2 font-medium text-amber-500">
                              残り{spotsLeft}名
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h2 className="mb-2 text-sm font-semibold text-gray-800">
                  イベント詳細
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {event.description}
                </p>
              </div>
            )}

            {!isEnded && (
              <Link
                href={reserveUrl}
                className={`mt-5 block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-colors ${
                  isFull
                    ? 'bg-gray-400 pointer-events-none'
                    : 'bg-[#06C755] hover:bg-[#05a847]'
                }`}
              >
                {isFull ? '満席のため受付終了' : 'LINEで予約する'}
              </Link>
            )}
          </div>
        </section>

        {reviews.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">参加者の声</h2>
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-3">
                {review.authorIconUrl ? (
                  <Image
                    src={review.authorIconUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5 text-xs text-gray-400">
                    {review.authorName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 mb-0.5">
                    {review.authorName}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {review.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
      <PublicFooter />
    </div>
  );
}
