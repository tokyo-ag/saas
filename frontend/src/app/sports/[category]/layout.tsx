import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

const CATEGORY_META: Record<string, { label: string; desc: string }> = {
  badminton:   { label: 'バドミントン',     desc: '東京の20代向けバドミントンサークル・交流イベントをCOMIUで検索。池袋・豊島区を拠点に板橋・北区・文京区エリアで開催多数。初心者歓迎の練習会から本格的な試合形式まで掲載。LINEでかんたん参加予約。' },
  futsal:      { label: 'フットサル',       desc: '東京の20代向けフットサルサークル・交流イベントをCOMIUで検索。池袋・豊島区・板橋区・練馬区エリアのコートで開催。男女混合チームで楽しめる試合から初心者向けイベントまで掲載。LINEで予約。' },
  basketball:  { label: 'バスケットボール', desc: '東京の20代向けバスケットボールサークル・交流イベントをCOMIUで検索。池袋・豊島区エリアの体育館・レンタルコートで開催。3on3から5on5まで様々なスタイル。初心者歓迎。LINEで予約。' },
  volleyball:  { label: 'バレーボール',     desc: '東京の20代向けバレーボールサークル・交流イベントをCOMIUで検索。池袋・豊島区エリアの体育館で開催多数。初心者歓迎のゆるい交流会から社会人向けの練習会まで掲載。LINEで参加予約。' },
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) return {};

  const title = `${meta.label}サークル・交流会 | 東京`;
  return {
    title,
    description: meta.desc,
    alternates: {
      canonical: `${SITE_URL}/sports/${category}`,
    },
    openGraph: {
      title,
      description: meta.desc,
      url: `${SITE_URL}/sports/${category}`,
      locale: 'ja_JP',
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
