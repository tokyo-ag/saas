import type { Metadata } from 'next';
import HomeClient from '@/components/public/HomeClient';
import type { PublicEvent, PublicTenant } from '@/lib/api';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';
import { SITE_URL } from '@/lib/config';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '東京の20代向けサークル・交流イベント',
  description:
    '東京の20代向けサークル・交流イベントをCOMIUで検索。バドミントン、フットサル、バスケ、バレーボールなどのイベントをLINEでかんたんに参加予約。初心者歓迎・社会人向けのコミュニティイベントが多数掲載。',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: '東京の20代向けサークル・交流イベント | COMIU',
    description:
      'バドミントン、フットサル、バスケ、バレーボールなど、東京の20代向けイベントをLINEでかんたん予約。',
    url: SITE_URL,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '東京の20代向けサークル・交流イベント | COMIU',
    description:
      '東京の20代向けサークル・交流イベントをCOMIUで検索。LINEでかんたんに参加予約できます。',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

async function fetchPublic<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, { next: { revalidate } });
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

export default async function TopPage({
  searchParams,
}: {
  searchParams?: Promise<{ prompt?: string }>;
}) {
  const params = await searchParams;
  const [events, tenants] = await Promise.all([
    fetchPublic<PublicEvent[]>('/public/events', []),
    fetchPublic<PublicTenant[]>('/public/tenants', []),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'COMIU',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/sports/{search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'COMIU',
        url: SITE_URL,
        logo: `${SITE_URL}/opengraph-image`,
        description: 'コミュニティのイベント管理をLINEで完結するSaaS',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient
        initialEvents={events}
        initialTenants={tenants}
        showHomePrompt={params?.prompt === 'home'}
      />
    </>
  );
}
