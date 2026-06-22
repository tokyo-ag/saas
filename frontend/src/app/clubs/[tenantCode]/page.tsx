import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

export const revalidate = 60;

type PublicClub = PublicTenant & {
  events: PublicEvent[];
};

async function fetchClub(tenantCode: string): Promise<PublicClub | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDateParts(dateStr: string) {
  const date = new Date(dateStr);
  return {
    monthDay: date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      timeZone: 'Asia/Tokyo',
    }),
    weekday: date.toLocaleDateString('ja-JP', {
      weekday: 'short',
      timeZone: 'Asia/Tokyo',
    }),
    time: date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    }),
  };
}

function eventHref(event: PublicEvent) {
  return event.tenantCode ? `/e/${event.tenantCode}/${event.id}` : '/';
}

function priceLabel(event: PublicEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `¥${Math.min(event.priceMale, event.priceFemale).toLocaleString()}〜`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function remainingLabel(event: PublicEvent) {
  if (event.capacity == null) return null;
  const remaining = event.capacity - event.reservedCount;
  if (remaining <= 0) return '満席';
  if (remaining <= 5) return `残り${remaining}席`;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}): Promise<Metadata> {
  const { tenantCode } = await params;
  const club = await fetchClub(tenantCode);
  if (!club) {
    return {
      title: '団体が見つかりません',
      robots: { index: false, follow: false },
    };
  }

  const name = club.lineDisplayName ?? club.name;
  const description = `${name}の開催予定イベント一覧です。日程を選んでCOMIUから参加予約できます。`;
  const image = imgUrl(club.linePictureUrl, IMAGE_BASE_URL);

  return {
    title: `${name}の日程・参加予約`,
    description,
    alternates: {
      canonical: `${SITE_URL}/clubs/${club.code ?? tenantCode}`,
    },
    openGraph: {
      title: `${name}の日程・参加予約 | COMIU`,
      description,
      locale: 'ja_JP',
      type: 'website',
      url: `${SITE_URL}/clubs/${club.code ?? tenantCode}`,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${name}の日程・参加予約 | COMIU`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const club = await fetchClub(tenantCode);
  if (!club) notFound();

  const name = club.lineDisplayName ?? club.name;
  const image = imgUrl(club.linePictureUrl, IMAGE_BASE_URL);
  const clubUrl = `${SITE_URL}/clubs/${club.code ?? tenantCode}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name,
        description: `${name}の開催予定イベント一覧です。日程を選んで参加予約できます。`,
        url: clubUrl,
        ...(image ? { image, logo: image } : {}),
      },
      ...(club.events.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: `${name}の開催予定`,
              numberOfItems: club.events.length,
              itemListElement: club.events.slice(0, 10).map((event, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}${eventHref(event)}`,
                name: event.title,
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] pb-8 text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 pb-3 pt-12 sm:pt-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/" className="-ml-1 p-1 text-gray-500" aria-label="戻る">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-bold text-gray-900">日程を選択</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        <section className="mb-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#06C755]/10 text-2xl font-bold text-[#06C755]">
              {name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#06C755]">COMIU</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{name}</h1>
              {club.description && (
                <p className="mt-3 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                  {club.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/liff/${club.code ?? tenantCode}`}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#06C755] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#05a847] sm:w-auto"
            >
              参加予約はこちら
            </Link>
            {club.publicBlogUrl && (
              <a
                href={club.publicBlogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                ブログを見る
              </a>
            )}
          </div>
        </section>
        {club.events.length === 0 ? (
          <section className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-sm">
            <p className="text-sm font-bold text-gray-800">
              現在、予約できる日程はありません
            </p>
            <p className="mt-2 text-xs leading-6 text-gray-400">
              新しい日程が公開されると、ここに表示されます。
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {club.events.map((event) => {
              const eventImage = imgUrl(event.imageUrl, IMAGE_BASE_URL);
              const date = formatDateParts(event.heldAt);
              const remaining = remainingLabel(event);
              const isFull = remaining === '満席';

              return (
                <Link
                  key={event.id}
                  href={eventHref(event)}
                  className="block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm active:bg-gray-50"
                >
                  <div className="flex gap-3 p-3">
                    <div className="flex w-[74px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white text-center">
                      <div className="bg-[#06C755] px-1 py-2 text-white">
                        <p className="text-lg font-bold leading-none">
                          {date.monthDay}
                        </p>
                        <p className="mt-1 text-[10px] font-bold">
                          {date.weekday}
                        </p>
                      </div>
                      <div className="px-1 py-2 text-[11px] font-bold text-gray-700">
                        {date.time}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start gap-2">
                        <h2 className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-gray-900">
                          {event.title}
                        </h2>
                        {remaining && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isFull
                                ? 'bg-red-50 text-red-500'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {remaining}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[12px] text-gray-500">
                        {event.location}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-gray-800">
                          {priceLabel(event)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                            isFull
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-[#06C755] text-white'
                          }`}
                        >
                          {isFull ? '詳細を見る' : '予約へ進む'}
                        </span>
                      </div>
                    </div>

                    {eventImage && (
                      <div className="relative hidden w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:block">
                        <Image
                          src={eventImage}
                          alt={event.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
