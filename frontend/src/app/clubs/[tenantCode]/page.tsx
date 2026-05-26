import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicEvent, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

export const revalidate = 60;

type PublicClub = PublicTenant & {
  events: PublicEvent[];
};

async function fetchClub(tenantCode: string): Promise<PublicClub | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(dateStr: string) {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}): Promise<Metadata> {
  const { tenantCode } = await params;
  const club = await fetchClub(tenantCode);
  if (!club) return { title: '団体が見つかりません', robots: { index: false, follow: false } };

  const name = club.lineDisplayName ?? club.name;
  const description = club.description ?? `${name}のイベント・交流会情報。開催予定のイベントをCOMIUで確認できます。`;
  const image = imgUrl(club.linePictureUrl, API_URL);

  return {
    title: `${name}のイベント・交流会`,
    description,
    alternates: {
      canonical: `${SITE_URL}/clubs/${club.code ?? tenantCode}`,
    },
    openGraph: {
      title: `${name} | COMIU`,
      description,
      type: 'website',
      url: `${SITE_URL}/clubs/${club.code ?? tenantCode}`,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${name} | COMIU`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const club = await fetchClub(tenantCode);
  if (!club) notFound();

  const name = club.lineDisplayName ?? club.name;
  const image = imgUrl(club.linePictureUrl, API_URL);
  const clubUrl = `${SITE_URL}/clubs/${club.code ?? tenantCode}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name,
        description: club.description,
        url: clubUrl,
        ...(image ? { image, logo: image } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name, item: clubUrl },
        ],
      },
      ...(club.events.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: `${name}の開催予定イベント`,
              numberOfItems: club.events.length,
              itemListElement: club.events
                .filter((event) => event.tenantCode)
                .slice(0, 10)
                .map((event, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  url: `${SITE_URL}/e/${event.tenantCode}/${event.id}`,
                  name: event.title,
                })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-bold text-gray-900">COMIU</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        <section className="bg-white rounded-2xl border border-gray-100 px-4 py-5 shadow-sm">
          <div className="flex items-start gap-4">
            {image ? (
              <Image
                src={image}
                alt={name}
                width={64}
                height={64}
                unoptimized
                className="w-16 h-16 rounded-full object-cover border border-gray-100 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#06C755] to-[#047a35] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xl">{name.slice(0, 1)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{name}</h1>
              {club.description && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{club.description}</p>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-gray-50 px-2 py-3">
              <p className="text-lg font-bold text-gray-900">{club.eventCount}</p>
              <p className="text-[10px] text-gray-400">イベント</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-2 py-3">
              <p className="text-lg font-bold text-gray-900">{club.memberCount}</p>
              <p className="text-[10px] text-gray-400">メンバー</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-2 py-3">
              <p className="text-lg font-bold text-gray-900">{club.accessCount}</p>
              <p className="text-[10px] text-gray-400">閲覧</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 px-1 mb-3">
            <span className="w-1 h-4 rounded-full bg-[#06C755] shrink-0" />
            <h2 className="text-[13px] font-bold text-gray-800">開催予定のイベント</h2>
          </div>

          {club.events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-10 text-center shadow-sm">
              <p className="text-sm font-semibold text-gray-700">現在、開催予定のイベントはありません</p>
              <p className="text-xs text-gray-400 mt-1">新しいイベントが公開されるとここに表示されます</p>
            </div>
          ) : (
            <div className="space-y-3">
              {club.events.map((event) => {
                const eventImage = imgUrl(event.imageUrl, API_URL);
                const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;
                return (
                  <Link
                    key={event.id}
                    href={eventHref(event)}
                    className="bg-white rounded-2xl overflow-hidden flex gap-3 p-3 block shadow-sm border border-gray-100"
                  >
                    <div className="relative w-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#06C755] to-[#047a35] aspect-[4/5]">
                      {eventImage && (
                        <Image
                          src={eventImage}
                          alt={event.title}
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
                      <p className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug">{event.title}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{formatDate(event.heldAt)}</p>
                      <p className="text-[11px] text-gray-400 truncate">{event.location}</p>
                      <div className="mt-1.5">
                        {event.priceMale != null && event.priceFemale != null
                          ? <span className="text-[11px] text-gray-600 font-medium">¥{Math.min(event.priceMale, event.priceFemale).toLocaleString()}〜</span>
                          : event.price === 0
                          ? <span className="text-[11px] text-[#06C755] font-semibold">無料</span>
                          : <span className="text-[11px] text-gray-600 font-medium">¥{event.price.toLocaleString()}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
