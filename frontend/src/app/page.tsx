import type { Metadata } from 'next';
import Link from 'next/link';
import HomeClient from '@/components/public/HomeClient';
import LiffReturnRedirector from '@/components/liff/LiffReturnRedirector';
import type { PublicEvent, PublicTenant } from '@/lib/api';

import {
  SITE_URL,
  API_URL,
  SUPPORT_EMAIL,
  OFFICIAL_LINE_URL,
  DISCOVERY_LOCKED,
} from '@/lib/config';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '東京の20代向けサークル・交流イベント検索',
  description:
    '東京の20代向けサークル・交流イベントをCOMIUで検索。バドミントン、フットサル、バスケ、バレーなどのイベントをLINEでかんたんに参加予約できます。初心者歓迎・社会人向けのイベントを掲載中です。',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: '東京の20代向けサークル・交流イベント検索 | COMIU',
    description:
      '東京の20代向けサークル・交流イベントを探して、LINEでかんたんに参加予約できます。',
    url: SITE_URL,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '東京の20代向けサークル・交流イベント検索 | COMIU',
    description:
      '東京の20代向けサークル・交流イベントを探して、LINEでかんたんに参加予約できます。',
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

function tenantHref(tenant: PublicTenant) {
  return `/liff/${tenant.code ?? tenant.id}`;
}

function tenantName(tenant: PublicTenant) {
  return tenant.lineDisplayName ?? tenant.name;
}

function LockedDiscoveryHome({ tenants }: { tenants: PublicTenant[] }) {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-8 text-gray-900">
      <LiffReturnRedirector />
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-sm flex-col">
        <div>
          <p className="text-[12px] font-bold tracking-wide text-[#06C755]">
            COMIU
          </p>
          <div className="mt-10">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">
              イベント検索は
              <br />
              ただいま準備中です
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              参加者の方は、主催者から届いたLINEリンクからイベントに参加できます。
              COMIUはまず、団体ごとの参加・連絡・通知が確実に動く状態を優先しています。
            </p>
          </div>
        </div>

        {tenants.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">
                登録している団体
              </h2>
              <span className="text-[11px] font-medium text-gray-400">
                {tenants.length}件
              </span>
            </div>
            <div className="space-y-2">
              {tenants.slice(0, 8).map((tenant) => {
                const name = tenantName(tenant);
                return (
                  <Link
                    key={tenant.id}
                    href={tenantHref(tenant)}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm active:bg-gray-50"
                  >
                    {tenant.linePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tenant.linePictureUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#06C755]/10 text-sm font-bold text-[#06C755]">
                        {name.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800">
                      {name}
                    </span>
                    <span className="text-lg leading-none text-gray-300">
                      ›
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-auto space-y-3 pb-8 pt-8">
          <Link
            href="/register"
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#06C755] text-sm font-bold text-white shadow-sm active:opacity-80"
          >
            無料で団体登録
          </Link>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-800 active:bg-gray-50"
          >
            主催者ログイン
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function TopPage({
  searchParams,
}: {
  searchParams?: Promise<{ prompt?: string }>;
}) {
  if (DISCOVERY_LOCKED) {
    const tenants = await fetchPublic<PublicTenant[]>('/public/tenants', []);
    return <LockedDiscoveryHome tenants={tenants} />;
  }

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
        inLanguage: 'ja-JP',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'COMIU',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        sameAs: [OFFICIAL_LINE_URL],
        description:
          '東京の20代向けサークル・交流イベントを探して、LINEで参加予約できるサービスです。',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: SUPPORT_EMAIL,
          url: OFFICIAL_LINE_URL,
          availableLanguage: ['ja'],
        },
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
      <HomeClient
        initialEvents={events}
        initialTenants={tenants}
        showHomePrompt={params?.prompt === 'home'}
      />
    </>
  );
}
