import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HubPage } from '../../guide/_hub/hubPage';

import { SITE_URL } from '@/lib/config';

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
  tabletennis: {
    slug: 'tabletennis',
    label: '卓球',
    intro:
      '東京で20代向けの卓球サークル・交流イベントを探せます。初心者歓迎、経験者向け、社会人向けの練習会を掲載しています。',
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

  return (
    <HubPage
      category={meta.label}
      area=""
      skipEmptyCheck
      canonicalPathOverride={`/sports/${category}`}
    />
  );
}
