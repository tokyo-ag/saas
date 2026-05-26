import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

export const revalidate = 60;

type CategoryMeta = {
  label: string;
  emoji: string;
  desc: string;
  intro: string;
  area: string;
  audience: string;
  faq: { q: string; a: string }[];
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  badminton: {
    label: 'バドミントン',
    emoji: '🏸',
    desc: 'バドミントンサークル・交流イベント一覧',
    intro:
      '東京で20代向けのバドミントンサークルや交流イベントを探せます。初心者歓迎の練習会から、社会人が仕事帰りや週末に参加しやすいイベントまで掲載しています。',
    area: '池袋・豊島区・板橋区・北区・文京区など、東京の体育館やスポーツ施設で開催されるイベントを中心に掲載しています。',
    audience: '20代社会人、初心者、久しぶりに運動したい人、同世代の友だちを増やしたい人が参加しやすいイベントを探せます。',
    faq: [
      { q: '初心者でも参加できますか？', a: 'はい。初心者歓迎や経験不問のイベントが多く、ラケット貸出の有無もイベント詳細で確認できます。' },
      { q: '参加費はどのくらいですか？', a: '会場費やシャトル代込みで500〜1,500円程度のイベントが中心です。詳細ページで事前に確認できます。' },
      { q: '参加申込はどうやって行いますか？', a: 'イベント詳細からLINEの予約画面へ進み、必要事項を入力するだけで申込できます。' },
    ],
  },
  futsal: {
    label: 'フットサル',
    emoji: '⚽',
    desc: 'フットサルサークル・交流イベント一覧',
    intro:
      '東京で20代向けのフットサルサークルや交流イベントを探せます。男女混合で楽しめる試合形式から、初心者も入りやすいゆるめのイベントまで掲載しています。',
    area: '池袋周辺、豊島区、板橋区、北区、練馬区など、アクセスしやすい東京のフットサルコートで開催されるイベントを中心に掲載しています。',
    audience: 'サッカー経験者だけでなく、運動不足を解消したい人、同世代と気軽に試合を楽しみたい人にも向いています。',
    faq: [
      { q: 'サッカー未経験でも参加できますか？', a: '初心者歓迎やエンジョイ寄りのイベントなら参加しやすいです。強度やレベルはイベント詳細で確認してください。' },
      { q: '一人参加でも大丈夫ですか？', a: '一人参加を前提にした交流イベントもあります。主催者や参加条件を見て選べます。' },
      { q: '必要な持ち物はありますか？', a: '動きやすい服装、シューズ、飲み物が基本です。屋内外やコート条件はイベント詳細で確認できます。' },
    ],
  },
  basketball: {
    label: 'バスケットボール',
    emoji: '🏀',
    desc: 'バスケットボールサークル・交流イベント一覧',
    intro:
      '東京で20代向けのバスケットボールサークルや交流イベントを探せます。3on3から5on5まで、社会人が参加しやすい日程のイベントを掲載しています。',
    area: '池袋・豊島区・板橋区・北区・文京区など、東京の体育館やレンタルコートで開催されるイベントを中心に掲載しています。',
    audience: '経験者はもちろん、久しぶりにバスケをしたい人、初心者歓迎の交流会を探している人にも使いやすい一覧です。',
    faq: [
      { q: 'ブランクがあっても参加できますか？', a: 'はい。エンジョイ寄りや初心者歓迎のイベントなら、久しぶりの方でも参加しやすいです。' },
      { q: '男女混合のイベントはありますか？', a: 'イベントごとに参加条件が異なります。詳細ページで男女比や対象レベルを確認できます。' },
      { q: '参加費は事前に分かりますか？', a: '各イベント詳細に参加費が表示されます。無料または会場費を参加者で分担するイベントがあります。' },
    ],
  },
  volleyball: {
    label: 'バレーボール',
    emoji: '🏐',
    desc: 'バレーボールサークル・交流イベント一覧',
    intro:
      '東京で20代向けのバレーボールサークルや交流イベントを探せます。初心者歓迎のゆるい交流会から、社会人向けの練習会まで掲載しています。',
    area: '池袋・豊島区・板橋区・北区・文京区など、東京の体育館で開催されるイベントを中心に掲載しています。',
    audience: 'バレー経験者、初心者、同世代とチームスポーツを楽しみたい人が参加しやすいイベントを探せます。',
    faq: [
      { q: 'バレーボール初心者でも参加できますか？', a: '初心者歓迎や経験不問のイベントなら参加しやすいです。レベル感はイベント詳細で確認できます。' },
      { q: '一人でも参加できますか？', a: '一人参加を受け付けているイベントがあります。LINEから申込できるので、初参加でも流れを確認しやすいです。' },
      { q: 'どのエリアで開催されていますか？', a: '池袋周辺や豊島区、板橋区、北区、文京区など、東京の体育館開催が中心です。' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(CATEGORY_META).map((category) => ({ category }));
}

export function generateMetadata(_: { params: Promise<{ category: string }> }): Metadata {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return { robots: { index: false, follow: false } };
  }
  return {};
}

async function fetchEvents(category: string): Promise<PublicEvent[]> {
  try {
    const params = new URLSearchParams({ category });
    const res = await fetch(`${API_URL}/api/public/events?${params.toString()}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  });
}

function eventHref(event: PublicEvent) {
  return event.tenantCode
    ? `/e/${event.tenantCode}/${event.id}`
    : '/';
}

export default async function SportsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-8 text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">まもなくオープン</p>
          <p className="text-sm text-gray-400 mt-1">このページは準備中です</p>
        </div>
        <Link href="/" className="bg-[#06C755] text-white font-bold text-sm px-8 py-3 rounded-full">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) notFound();

  const events = await fetchEvents(category);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: `${meta.label}サークル・交流会 東京`, item: `${SITE_URL}/sports/${category}` },
        ],
      },
      ...(events.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: `${meta.label}のイベント一覧`,
              numberOfItems: events.length,
              itemListElement: events
                .filter((ev) => ev.tenantCode)
                .slice(0, 10)
                .map((ev, i) => ({
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-gray-900">{meta.emoji} {meta.label}サークル・交流会 東京</h1>
            <p className="text-[11px] text-gray-400">{meta.desc}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">{meta.emoji}</p>
            <p className="text-gray-700 font-semibold text-sm">{meta.label}のイベントは現在ありません</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">主催者が増えるとここにイベントが表示されます</p>
            <Link href="/" className="mt-6 bg-[#06C755] text-white font-bold text-sm px-6 py-2.5 rounded-full">
              トップへ戻る
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const img = imgUrl(ev.imageUrl, API_URL);
              const org = ev.tenant.lineDisplayName ?? ev.tenant.name;
              const remaining = ev.capacity != null ? ev.capacity - ev.reservedCount : null;

              return (
                <Link key={ev.id} href={eventHref(ev)}
                  className="bg-white rounded-2xl overflow-hidden flex gap-3 p-3 block"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                >
                  <div className="relative w-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#06C755] to-[#047a35] aspect-[4/5]">
                    {img && (
                      <Image
                        src={img}
                        alt={ev.title}
                        fill
                        unoptimized
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                    {remaining !== null && remaining <= 0 && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">満席</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug">{ev.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{fmtDate(ev.heldAt)}</p>
                    <p className="text-[11px] text-gray-400 truncate">{ev.location}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{org}</span>
                      {ev.priceMale != null && ev.priceFemale != null
                        ? <span className="text-[11px] text-gray-600 font-medium">¥{Math.min(ev.priceMale, ev.priceFemale).toLocaleString()}〜</span>
                        : ev.price === 0
                        ? <span className="text-[11px] text-[#06C755] font-semibold">無料</span>
                        : <span className="text-[11px] text-gray-600 font-medium">¥{ev.price.toLocaleString()}</span>}
                    </div>
                    {ev.viewCount > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">閲覧数: {ev.viewCount.toLocaleString()}</p>
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
                <h3 className="text-sm font-semibold text-gray-800">{item.q}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
