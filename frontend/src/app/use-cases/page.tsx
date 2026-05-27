import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '活用事例',
  description:
    'COMIUの活用事例一覧。バドミントン・バスケットボール・フットサル・バレーボールなど東京の20代向けスポーツサークルが、COMIUでどのようにイベント管理・参加者募集を行っているかを種目別に紹介します。',
  alternates: {
    canonical: `${SITE_URL}/use-cases`,
  },
  openGraph: {
    title: '活用事例 | COMIU',
    description:
      'バドミントン・バスケ・フットサル・バレーボールなど、東京の20代向けサークルのイベント管理事例を紹介。',
    url: `${SITE_URL}/use-cases`,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '活用事例 | COMIU',
    description:
      'バドミントン・バスケ・フットサル・バレーボールなど、東京の20代向けサークルのイベント管理事例を紹介。',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

const USE_CASES = [
  {
    slug: 'badminton-tokyo',
    emoji: '🏸',
    title: 'バドミントンサークル 東京 20代',
    description: '池袋・豊島区を拠点に板橋・北区・文京区エリアで開催。初心者歓迎・社会人歓迎。',
  },
  {
    slug: 'basketball-tokyo',
    emoji: '🏀',
    title: 'バスケットボールサークル 東京 20代',
    description: '3on3から5on5まで、東京の体育館・レンタルコートで開催。初心者歓迎。',
  },
  {
    slug: 'futsal-tokyo',
    emoji: '⚽',
    title: 'フットサルサークル 東京 20代',
    description: '男女混合で楽しめる試合形式から、初心者向けのゆるいイベントまで掲載。',
  },
  {
    slug: 'volleyball-tokyo',
    emoji: '🏐',
    title: 'バレーボールサークル 東京 20代',
    description: '初心者歓迎の交流会から社会人向け練習会まで。東京の体育館で開催多数。',
  },
];

export default function UseCasesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: '活用事例', item: `${SITE_URL}/use-cases` },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'COMIUの活用事例',
        numberOfItems: USE_CASES.length,
        itemListElement: USE_CASES.map((uc, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/use-cases/${uc.slug}`,
          name: uc.title,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#06C755] rounded-xl flex items-center justify-center">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <span className="font-bold text-gray-900">COMIU</span>
            </Link>
            <Link
              href="/register"
              className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#05a847] transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="mb-3 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-600">ホーム</Link>
            <span className="mx-2">/</span>
            <span>活用事例</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">活用事例</h1>
          <p className="text-gray-500 text-base mb-12">
            東京の20代向けスポーツサークルのイベント管理事例を種目別に紹介します。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {USE_CASES.map((uc) => (
              <Link
                key={uc.slug}
                href={`/use-cases/${uc.slug}`}
                className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-[#06C755] hover:shadow-md transition-all"
              >
                <p className="text-4xl mb-4">{uc.emoji}</p>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#06C755] transition-colors">
                  {uc.title}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">{uc.description}</p>
                <p className="mt-4 text-sm text-[#06C755] font-medium">詳しく見る →</p>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-gray-500 text-sm mb-4">どのスポーツでも無料から始められます</p>
            <Link
              href="/register"
              className="inline-block bg-[#06C755] text-white font-bold px-8 py-4 rounded-2xl text-base hover:bg-[#05a847] transition-colors"
            >
              無料で始める →
            </Link>
          </div>
        </div>

        <footer className="px-4 py-8 border-t border-gray-100 text-center">
          <div className="flex items-center justify-center gap-4 mb-4 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-600">ホーム</Link>
            <Link href="/pricing" className="hover:text-gray-600">料金プラン</Link>
            <Link href="/register" className="hover:text-gray-600">新規登録</Link>
          </div>
          <p className="text-[11px] text-gray-300">© COMIU</p>
        </footer>
      </div>
    </>
  );
}
