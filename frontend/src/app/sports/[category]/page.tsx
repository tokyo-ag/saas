import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import PublicFooter from '@/components/public/PublicFooter';
import {
  fetchCircles,
  fetchArticlesByCategory,
  fetchBlogPostsByCategory,
  buildOfficialRelated,
  buildTeamRelated,
  buildFaqItems,
  CircleCard,
  RelatedArticleCard,
} from '../../guide/_hub/hubPage';

import { SITE_URL, API_URL, IMAGE_BASE_URL } from '@/lib/config';

export const revalidate = 60;

type CategoryMeta = {
  label: string;
  slug: string;
  intro: string;
  area: string;
  audience: string;
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

  const [events, circles, officialArticles, blogPosts] = await Promise.all([
    fetchEvents(category),
    fetchCircles(meta.label, undefined, 12),
    fetchArticlesByCategory(meta.label),
    fetchBlogPostsByCategory(meta.label, 10, 2),
  ]);
  const listedEvents = events.filter((ev) => ev.tenantCode).slice(0, 10);
  const officialRelated = buildOfficialRelated(officialArticles, meta.label, '', 3);
  const teamRelated = buildTeamRelated(blogPosts, 3);
  const faqItems = buildFaqItems(meta.label, '', circles);

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
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
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
        <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
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
          <h2 className="text-base font-bold text-gray-900">団体一覧</h2>
          {circles.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-gray-400">現在、掲載団体を準備中です。</p>
          ) : (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {circles.map((circle) => <CircleCard key={circle.id} circle={circle} area="" />)}
            </div>
          )}
        </section>

        <section className="mt-4">
          <h2 className="mb-3 text-base font-bold text-gray-900">📅 直近開催イベント</h2>
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
                        <Image
                          src={DEFAULT_EVENT_IMAGE}
                          alt={ev.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
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
        </section>

        {officialRelated.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">COMIUの{meta.label}記事</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {officialRelated.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {teamRelated.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">団体の{meta.label}記事</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {teamRelated.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl bg-white border border-gray-100 px-4 py-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">よくある質問</h2>
          <div className="mt-4 space-y-4">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="text-sm font-semibold text-gray-800">
                  {item.question}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <PublicFooter />
    </div>
  );
}
