import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent, PortalBlogPost } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import PublicFooter from '@/components/public/PublicFooter';

import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

export const revalidate = 60;

const CATEGORY_TAGS: Record<string, string[]> = {
  badminton: ['バドミントン', 'バド'],
  futsal: ['フットサル', 'サッカー'],
  basketball: ['バスケ', 'バスケットボール'],
  volleyball: ['バレー', 'バレーボール'],
};

type CategoryMeta = {
  label: string;
  slug: string;
  intro: string;
  area: string;
  audience: string;
  faq: { q: string; a: string }[];
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  badminton: {
    slug: 'badminton',
    label: 'バドミントン',
    intro:
      '東京で20代向けのバドミントンサークル・交流イベントを探せます。初心者歓迎、社会人向け、ひとり参加しやすいイベントを掲載しています。',
    area:
      '池袋、板橋、文京、豊島、新宿など、東京の体育館やスポーツ施設で開催されるイベントを中心に掲載します。',
    audience:
      '20代社会人、初心者、久しぶりに運動したい人、同年代の友達を増やしたい人に向いています。',
    faq: [
      {
        q: '初心者でも参加できますか？',
        a: 'イベントごとに条件は異なりますが、初心者歓迎や経験不問のイベントを掲載しています。詳細ページでレベルや持ち物を確認できます。',
      },
      {
        q: 'ラケットを持っていなくても大丈夫ですか？',
        a: '貸出の有無はイベントごとに異なります。イベント詳細ページで主催者の案内を確認してください。',
      },
      {
        q: '参加費はどのくらいですか？',
        a: '無料イベントから、会場費を参加者で分けるイベントまであります。参加費は詳細ページで事前に確認できます。',
      },
    ],
  },
  futsal: {
    slug: 'futsal',
    label: 'フットサル',
    intro:
      '東京で20代向けのフットサルサークル・交流イベントを探せます。男女混合、初心者歓迎、社会人向けのイベントを掲載しています。',
    area:
      '池袋、渋谷、新宿、練馬、豊島など、アクセスしやすい東京のフットサルコートで開催されるイベントを中心に掲載します。',
    audience:
      'サッカー経験者だけでなく、運動不足を解消したい人、同年代と気軽に試合を楽しみたい人にも向いています。',
    faq: [
      {
        q: 'サッカー未経験でも参加できますか？',
        a: '初心者歓迎やエンジョイ寄りのイベントであれば参加しやすいです。強度やレベルはイベント詳細で確認してください。',
      },
      {
        q: 'ひとり参加でも大丈夫ですか？',
        a: 'ひとり参加を前提にした交流イベントもあります。主催者や参加条件を見て選べます。',
      },
      {
        q: '必要な持ち物はありますか？',
        a: '動きやすい服装、シューズ、飲み物が基本です。屋内外やコート条件はイベント詳細で確認できます。',
      },
    ],
  },
  basketball: {
    slug: 'basketball',
    label: 'バスケ',
    intro:
      '東京で20代向けのバスケサークル・交流イベントを探せます。3on3から5on5まで、社会人が参加しやすいイベントを掲載しています。',
    area:
      '池袋、板橋、文京、豊島、新宿など、東京の体育館やレンタルコートで開催されるイベントを中心に掲載します。',
    audience:
      '経験者はもちろん、久しぶりにバスケをしたい人、初心者歓迎の交流会を探している人にも使いやすい一覧です。',
    faq: [
      {
        q: 'ブランクがあっても参加できますか？',
        a: 'エンジョイ寄りや初心者歓迎のイベントなら参加しやすいです。イベント詳細でレベル感を確認してください。',
      },
      {
        q: '男女混合のイベントはありますか？',
        a: 'イベントごとに参加条件が異なります。詳細ページで対象者や雰囲気を確認できます。',
      },
      {
        q: '参加費は事前に分かりますか？',
        a: 'はい。イベント詳細に参加費を表示しています。無料または会場費を分けるイベントがあります。',
      },
    ],
  },
  volleyball: {
    slug: 'volleyball',
    label: 'バレー',
    intro:
      '東京で20代向けのバレーサークル・交流イベントを探せます。初心者歓迎、経験者向け、社会人向けの練習会を掲載しています。',
    area:
      '池袋、板橋、文京、豊島、新宿など、東京の体育館で開催されるイベントを中心に掲載します。',
    audience:
      'バレー経験者、初心者、同年代とチームスポーツを楽しみたい人が参加しやすいイベントを探せます。',
    faq: [
      {
        q: 'バレー初心者でも参加できますか？',
        a: '初心者歓迎や経験不問のイベントなら参加しやすいです。ルールやレベル感はイベント詳細で確認できます。',
      },
      {
        q: 'ひとりでも参加できますか？',
        a: 'ひとり参加を受け付けているイベントがあります。LINEから申し込めるので、流れを確認しやすいです。',
      },
      {
        q: 'どのエリアで開催されていますか？',
        a: '池袋周辺、豊島、板橋、文京、新宿など、東京の体育館開催が中心です。',
      },
    ],
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

async function fetchBlogPosts(category: string): Promise<PortalBlogPost[]> {
  const tags = CATEGORY_TAGS[category];
  if (!tags) return [];
  try {
    const res = await fetch(
      `${API_URL}/api/public/blog?tags=${encodeURIComponent(tags.join(','))}&limit=5`,
      { next: { revalidate } },
    );
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

  const [events, blogPosts] = await Promise.all([
    fetchEvents(category),
    fetchBlogPosts(category),
  ]);
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
            name: `${meta.label}サークル・交流会 東京`,
            item: `${SITE_URL}/sports/${category}`,
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
          <Link href="/" className="text-gray-500 p-1 -ml-1">
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
            <h1 className="text-[18px] font-bold text-gray-900">
              {meta.label}サークル・交流会 東京
            </h1>
            <p className="text-[11px] text-gray-400">
              20代向けイベントをLINEで参加予約
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-700 font-semibold text-sm">
              {meta.label}のイベントは現在ありません
            </p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              主催者がイベントを公開すると、ここに表示されます。
            </p>
            <Link
              href="/"
              className="mt-6 bg-[#06C755] text-white font-bold text-sm px-6 py-2.5 rounded-full"
            >
              トップへ戻る
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const image = imgUrl(ev.imageUrl, IMAGE_BASE_URL);
              const org = ev.tenant.lineDisplayName ?? ev.tenant.name;
              const remaining =
                ev.capacity != null ? ev.capacity - ev.reservedCount : null;

              return (
                <Link
                  key={ev.id}
                  href={eventHref(ev)}
                  className="bg-white rounded-2xl overflow-hidden flex gap-3 p-3 block"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                >
                  <div className="relative w-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 aspect-[4/5]">
                    {image ? (
                      <Image
                        src={image}
                        alt={ev.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
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
                    <p className="text-[11px] text-gray-400 mt-1">
                      {fmtDate(ev.heldAt)}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {ev.location}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{org}</span>
                        {ev.tags?.[0] && (
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 shrink-0">{ev.tags[0]}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 font-medium shrink-0">
                        {priceLabel(ev)}
                      </span>
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

        <section className="mt-8 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">
            東京で{meta.label}サークル・交流会を探すなら
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {meta.intro}
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800">開催エリア</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {meta.area}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-800">
                こんな人におすすめ
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {meta.audience}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-800">申込方法</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                気になるイベントを選び、詳細ページからLINEで参加予約できます。日程、場所、参加費、定員を確認してから申し込めます。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">よくある質問</h2>
          <div className="mt-4 space-y-4">
            {meta.faq.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold text-gray-800">
                  {item.q}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {blogPosts.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">{meta.label}関連ブログ</h2>
            <div className="space-y-3">
              {blogPosts.map((post) => {
                const tenantCode = post.tenant.code;
                if (!tenantCode) return null;
                const cover = post.coverImageUrl ? imgUrl(post.coverImageUrl, IMAGE_BASE_URL) : null;
                const tenantName = post.tenant.lineDisplayName ?? post.tenant.name;
                return (
                  <Link
                    key={post.id}
                    href={`/clubs/${tenantCode}/blog/${post.slug}`}
                    className="flex gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                  >
                    {cover && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-gray-900 line-clamp-2 leading-snug">{post.title}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{tenantName}</p>
                      {post.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
