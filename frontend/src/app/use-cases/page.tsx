import type { Metadata } from 'next';
import Link from 'next/link';

import PublicFooter from '@/components/public/PublicFooter';
import { SITE_URL } from '@/lib/config';
import { USE_CASES } from '@/lib/useCasesData';

export const metadata: Metadata = {
  title: '活用事例',
  description:
    'COMIUの活用事例一覧。バドミントン、バスケ、フットサル、バレーなど、東京の20代向けサークル・交流イベントを探す人と主催者向けの使い方を紹介します。',
  alternates: {
    canonical: `${SITE_URL}/use-cases`,
  },
  openGraph: {
    title: '活用事例 | COMIU',
    description:
      '東京の20代向けサークル・交流イベントを探す人と主催者向けの使い方を紹介します。',
    url: `${SITE_URL}/use-cases`,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '活用事例 | COMIU',
    description:
      '東京の20代向けサークル・交流イベントを探す人と主催者向けの使い方を紹介します。',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function UseCasesPage() {
  const cases = Object.values(USE_CASES);
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
            name: '活用事例',
            item: `${SITE_URL}/use-cases`,
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'COMIUの活用事例',
        numberOfItems: cases.length,
        itemListElement: cases.map((uc, i) => ({
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900">
              COMIU
            </Link>
            <Link
              href="/register"
              className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#05a847] transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="mb-3 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              ホーム
            </Link>
            <span className="mx-2">/</span>
            <span>活用事例</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            活用事例
          </h1>
          <p className="text-gray-500 text-base mb-12 leading-relaxed">
            東京の20代向けサークル・交流イベントを探す人と、イベントを主催する人に向けて、COMIUの使い方を種目別に紹介します。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map((uc) => (
              <Link
                key={uc.slug}
                href={`/use-cases/${uc.slug}`}
                className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-[#06C755] hover:shadow-md transition-all"
              >
                <p className="text-xs font-bold text-[#06C755] mb-3">COMIU</p>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#06C755] transition-colors">
                  {uc.title}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {uc.ogDescription}
                </p>
                <p className="mt-4 text-sm text-[#06C755] font-medium">
                  詳しく見る
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-gray-500 text-sm mb-4">
              サークル運営も、イベント参加も、まずは無料で始められます。
            </p>
            <Link
              href="/register"
              className="inline-block bg-[#06C755] text-white font-bold px-8 py-4 rounded-2xl text-base hover:bg-[#05a847] transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
