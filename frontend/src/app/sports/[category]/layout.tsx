import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

const CATEGORY_META: Record<string, { label: string; desc: string }> = {
  badminton:   { label: 'バドミントン',     desc: '東京の20代向けバドミントンサークル・交流イベント一覧。初心者歓迎の練習会から本格的な試合形式まで。' },
  futsal:      { label: 'フットサル',       desc: '東京の20代向けフットサルサークル・交流イベント一覧。男女混合チームでワイワイ楽しめる試合多数。' },
  basketball:  { label: 'バスケットボール', desc: '東京の20代向けバスケットボールサークル・交流イベント一覧。3on3から5on5まで様々なスタイル。' },
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) return {};

  const title = `${meta.label}サークル・交流会 | 東京`;
  return {
    title,
    description: meta.desc,
    openGraph: {
      title,
      description: meta.desc,
      type: 'website',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: meta.desc,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
