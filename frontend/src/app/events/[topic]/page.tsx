import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import PublicFooter from '@/components/public/PublicFooter';
import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

export const revalidate = 60;

type TopicMeta = {
  slug: string;
  label: string;
  title: string;
  description: string;
  category?: string;
  tag?: string;
  intro: string;
  area: string;
  audience: string;
  faq: { q: string; a: string }[];
};

const TOPIC_META: Record<string, TopicMeta> = {
  meetup: {
    slug: 'meetup',
    label: '交流会',
    title: '交流会 東京 20代',
    description:
      '東京で20代向けの交流会を探すならCOMIU。初参加歓迎、ひとり参加歓迎、社会人向け、友達作りに参加しやすいイベントをLINEで予約できます。',
    category: 'meetup',
    tag: '交流会',
    intro:
      '東京で開催される20代向けの交流会を探せます。初参加歓迎、ひとり参加歓迎、社会人向け、友達作りに参加しやすいイベントを掲載しています。',
    area:
      '池袋、渋谷、新宿、豊島、文京、板橋など、東京のアクセスしやすいエリアで開催されるイベントを中心に掲載します。',
    audience:
      '同年代の友達を増やしたい人、仕事や学校以外のつながりを作りたい人、ひとりでも参加しやすい交流会を探している人に向いています。',
    faq: [
      {
        q: 'ひとり参加でも大丈夫ですか？',
        a: 'ひとり参加歓迎のイベントを探しやすくしています。イベント詳細で雰囲気や参加条件を確認できます。',
      },
      {
        q: '初参加でも参加しやすいですか？',
        a: '初参加歓迎や初心者歓迎のタグが付いたイベントなら参加しやすいです。詳細ページで流れや持ち物を確認できます。',
      },
      {
        q: '申し込みはどうやって行いますか？',
        a: 'イベント詳細ページからLINEの予約画面へ進み、必要事項を入力して申し込めます。',
      },
    ],
  },
};

const RELATED_LINKS = [
  { href: '/sports/badminton', label: 'バドミントン' },
  { href: '/sports/basketball', label: 'バスケ' },
  { href: '/sports/futsal', label: 'フットサル' },
  { href: '/sports/volleyball', label: 'バレー' },
];

export function generateStaticParams() {
  return Object.keys(TOPIC_META).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return { robots: { index: false, follow: false } };
  }

  const { topic } = await params;
  const meta = TOPIC_META[topic];
  if (!meta) return {};

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${SITE_URL}/events/${meta.slug}` },
    openGraph: {
      title: `${meta.title} | COMIU`,
      description: meta.description,
      url: `${SITE_URL}/events/${meta.slug}`,
      locale: 'ja_JP',
      type: 'website',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${meta.title} | COMIU`,
      description: meta.description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

async function fetchEvents(meta: TopicMeta): Promise<PublicEvent[]> {
  const queries = [
    meta.category ? new URLSearchParams({ category: meta.category }) : null,
    meta.tag ? new URLSearchParams({ tag: meta.tag }) : null,
  ].filter((params): params is URLSearchParams => params !== null);

  const results = await Promise.all(
    queries.map(async (params) => {
      try {
        const res = await fetch(`${API_URL}/api/public/events?${params.toString()}`, {
          next: { revalidate },
        });
        if (!res.ok) return [] as PublicEvent[];
        return (await res.json()) as PublicEvent[];
      } catch {
        return [] as PublicEvent[];
      }
    }),
  );

  const merged = new Map<string, PublicEvent>();
  for (const event of results.flat()) {
    merged.set(event.id, event);
  }
  return [...merged.values()].sort(
    (a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime(),
  );
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

export default async function EventTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-8 text-center gap-5">
        <div>
          <p className="text-lg font-bold text-gray-800">まもなく公開</p>
          <p className="text-sm text-gray-400 mt-1">このページは準備中です</p>
        </div>
        <Link href="/" className="bg-[#06C755] text-white font-bold text-sm px-8 py-3 rounded-full">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const { topic } = await params;
  const meta = TOPIC_META[topic];
  if (!meta) notFound();

  const events = await fetchEvents(meta);
  const listedEvents = events.filter((ev) => ev.tenantCode).slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: meta.title,
            item: `${SITE_URL}/events/${meta.slug}`,
          },
        ],
      },
      ...(listedEvents.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: `${meta.label}イベント一覧`,
              numberOfItems: listedEvents.length,
              itemListElement: listedEvents.map((ev, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}/e/${ev.tenantCode}/${ev.id}`,
                name: ev.title,
              })),
            },
          ]
        : []),
      {
        '@type': 'FAQPage',
        mainEntity: meta.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 p-1 -ml-1" aria-label="トップへ戻る">
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
          <div>
            <h1 className="text-[18px] font-bold text-gray-900">{meta.title}</h1>
            <p className="text-[11px] text-gray-400">LINEで参加予約できるイベント一覧</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-700 font-semibold text-sm">
              {meta.label}イベントは現在ありません
            </p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              主催者がイベントを公開すると、ここに表示されます。
            </p>
            <Link href="/" className="mt-6 bg-[#06C755] text-white font-bold text-sm px-6 py-2.5 rounded-full">
              トップへ戻る
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
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
                  <div className="relative w-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#06C755] to-[#047a35] aspect-[4/5]">
                    {image && (
                      <Image src={image} alt={ev.title} fill sizes="80px" className="object-cover" />
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
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{org}</span>
                      <span className="text-[11px] text-gray-600 font-medium">{priceLabel(ev)}</span>
                    </div>
                    {ev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ev.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[10px] font-semibold text-[#047a35]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <section className="mt-8 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">東京で{meta.label}を探すなら</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{meta.intro}</p>
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800">開催エリア</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{meta.area}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-800">こんな人におすすめ</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{meta.audience}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">ほかのイベントを探す</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {RELATED_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">よくある質問</h2>
          <div className="mt-4 space-y-4">
            {meta.faq.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold text-gray-800">{item.q}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
