import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import { HubPage } from '../../guide/_hub/hubPage';

import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

export const revalidate = 60;

type CategoryMeta = {
  label: string;
  slug: string;
  intro: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  badminton: {
    slug: 'badminton',
    label: 'バドミントン',
    intro:
      '東京で20代向けのバドミントンサークル・交流イベントを探せます。初心者歓迎、社会人向け、ひとり参加しやすいイベントを掲載しています。',
  },
  futsal: {
    slug: 'futsal',
    label: 'フットサル',
    intro:
      '東京で20代向けのフットサルサークル・交流イベントを探せます。男女混合、初心者歓迎、社会人向けのイベントを掲載しています。',
  },
  basketball: {
    slug: 'basketball',
    label: 'バスケ',
    intro:
      '東京で20代向けのバスケサークル・交流イベントを探せます。3on3から5on5まで、社会人が参加しやすいイベントを掲載しています。',
  },
  volleyball: {
    slug: 'volleyball',
    label: 'バレー',
    intro:
      '東京で20代向けのバレーサークル・交流イベントを探せます。初心者歓迎、経験者向け、社会人向けの練習会を掲載しています。',
  },
};

export function generateStaticParams() {
  return Object.keys(CATEGORY_META).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return { robots: { index: false, follow: false } };
  }
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) return {};
  const title = `${meta.label}サークル・交流会 東京`;
  return {
    title,
    description: meta.intro,
    alternates: { canonical: `${SITE_URL}/sports/${category}` },
    openGraph: {
      title: `${title} | COMIU`,
      description: meta.intro,
      url: `${SITE_URL}/sports/${category}`,
      locale: 'ja_JP',
      type: 'website',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | COMIU`,
      description: meta.intro,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

async function fetchEvents(category: string): Promise<PublicEvent[]> {
  try {
    const params = new URLSearchParams({ category });
    const res = await fetch(`${API_URL}/api/public/events?${params.toString()}`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
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

// Renders in the same "mx-auto max-w-6xl px-5 py-8" section rhythm as the rest of HubPage's
// body, between 団体一覧 and the article sections - the event cards themselves are unchanged.
function EventsSection({ events, meta }: { events: PublicEvent[]; meta: CategoryMeta }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <h2 className="text-lg font-bold text-gray-950">📅 直近開催イベント</h2>
      {events.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-14 text-center text-sm text-gray-400">
          現在、{meta.label}のイベントはありません。主催者がイベントを公開すると、ここに表示されます。
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((ev) => {
            const image = imgUrl(ev.imageUrl, IMAGE_BASE_URL);
            const org = ev.tenant.lineDisplayName ?? ev.tenant.name;
            const remaining = ev.capacity != null ? ev.capacity - ev.reservedCount : null;

            return (
              <Link
                key={ev.id}
                href={eventHref(ev)}
                className="bg-white rounded-2xl overflow-hidden flex gap-3 p-3 block"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              >
                <div className="relative w-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 aspect-[4/5]">
                  {image ? (
                    <Image src={image} alt={ev.title} fill sizes="80px" className="object-cover" />
                  ) : (
                    <Image src={DEFAULT_EVENT_IMAGE} alt={ev.title} fill sizes="80px" className="object-cover" />
                  )}
                  {remaining !== null && remaining <= 0 && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">
                      満席
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug">
                    {ev.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">{fmtDate(ev.heldAt)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{ev.location}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{org}</span>
                      {ev.tags?.[0] && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 shrink-0">{ev.tags[0]}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-600 font-medium shrink-0">{priceLabel(ev)}</span>
                  </div>
                  {ev.viewCount > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      閲覧数: {ev.viewCount.toLocaleString()}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function SportsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-8 text-center gap-5">
        <div>
          <p className="text-lg font-bold text-gray-800">まもなく公開</p>
          <p className="text-sm text-gray-400 mt-1">
            このページは準備中です
          </p>
        </div>
        <Link
          href="/"
          className="bg-[#06C755] text-white font-bold text-sm px-8 py-3 rounded-full"
        >
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) notFound();

  const events = await fetchEvents(category);

  return (
    <HubPage
      category={meta.label}
      area=""
      eventsSection={<EventsSection events={events} meta={meta} />}
      skipEmptyCheck
      canonicalPathOverride={`/sports/${category}`}
    />
  );
}
