import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ReservationViewShowcase, ReservationShowcaseEvent } from '@/components/public/ReservationViewShowcase';
import { SITE_URL, API_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';

type TenantEventsData = {
  code?: string | null;
  name: string;
  description?: string | null;
  eventsSeoDescription?: string | null;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  liffId?: string | null;
  pages?: Array<{ slug: string }>;
  events: ReservationShowcaseEvent[];
};

// ページ上の表示用：改行はそのまま残し、行内の余分な空白だけ整える。
function shortDescription(description: string | null | undefined): string {
  if (!description) return '';
  return description
    .trim()
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .slice(0, 300);
}

// meta description用：改行を含め1行に平坦化する。
function flattenForMeta(description: string | null | undefined): string {
  if (!description) return '';
  return description.trim().replace(/\s+/g, ' ').slice(0, 150);
}

// 予約スケジュールページ専用のSEO文言があれば優先し、無ければ団体の紹介文にフォールバックする。
function eventsIntroText(tenant: TenantEventsData): string {
  return shortDescription(tenant.eventsSeoDescription) || shortDescription(tenant.description);
}

function eventsMetaDescriptionSource(tenant: TenantEventsData): string {
  return flattenForMeta(tenant.eventsSeoDescription) || flattenForMeta(tenant.description);
}

type TenantPageStyle = {
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  reserveViewStyle?: string | null;
};

async function fetchTenant(tenantCode: string): Promise<TenantEventsData | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchPageStyle(tenantCode: string, slug: string): Promise<TenantPageStyle | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}): Promise<Metadata> {
  const { tenantCode } = await params;
  const tenant = await fetchTenant(tenantCode);
  if (!tenant) {
    return { title: '団体が見つかりません', robots: { index: false, follow: false } };
  }
  const name = tenant.lineDisplayName || tenant.name;
  const title = `${name}の予約スケジュール`;
  const bio = eventsMetaDescriptionSource(tenant);
  const description = bio
    ? `${bio}／${name}が開催するイベントの予約スケジュール一覧です。LINEなしでもご覧いただけます。`
    : `${name}が開催するイベントの予約スケジュール一覧です。LINEなしでもご覧いただけます。`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/e/${tenantCode}` },
    openGraph: { title, description, url: `${SITE_URL}/e/${tenantCode}` },
  };
}

function eventJsonLd(event: ReservationShowcaseEvent, tenantCode: string, tenantName: string) {
  const isFull = event.capacity != null && (event.reservedCount ?? 0) >= event.capacity;
  const url = `${SITE_URL}/e/${tenantCode}/${event.id}`;
  const offers =
    event.priceMale != null && event.priceFemale != null
      ? [
          { '@type': 'Offer', name: '男性', price: String(event.priceMale), priceCurrency: 'JPY', availability: isFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url },
          { '@type': 'Offer', name: '女性', price: String(event.priceFemale), priceCurrency: 'JPY', availability: isFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url },
        ]
      : event.price != null
        ? { '@type': 'Offer', price: String(event.price), priceCurrency: 'JPY', availability: isFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url }
        : undefined;
  const image = imgUrl(event.imageUrl, API_URL);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.heldAt,
    ...(event.endAt && { endDate: event.endAt }),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.locationHint || event.location || tenantName,
    },
    ...(image && { image: [image] }),
    organizer: { '@type': 'Organization', name: tenantName },
    ...(offers && { offers }),
    url,
  };
}

function breadcrumbJsonLd(tenantCode: string, tenantName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: tenantName, item: `${SITE_URL}/clubs/${tenantCode}` },
      { '@type': 'ListItem', position: 3, name: '予約スケジュール', item: `${SITE_URL}/e/${tenantCode}` },
    ],
  };
}

export default async function TenantEventsPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const tenant = await fetchTenant(tenantCode);
  if (!tenant) notFound();

  const slug = tenant.pages?.[0]?.slug;
  const page = slug ? await fetchPageStyle(tenantCode, slug) : null;

  const accentColor = page?.accentColor || '#06C755';
  const backgroundColor = page?.backgroundColor || '#F7F8FA';
  const textColor = page?.textColor || '#111827';
  const name = tenant.lineDisplayName || tenant.name;
  const icon = tenant.linePictureUrl;
  const events = tenant.events ?? [];
  const eventsJsonLd = events.map((event) => eventJsonLd(event, tenantCode, name));
  const jsonLd = [breadcrumbJsonLd(tenantCode, name), ...eventsJsonLd];

  return (
    <div style={{ backgroundColor, minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          {icon && (
            <Link href={`/clubs/${tenantCode}`} className="shrink-0">
              <img src={icon} alt="" className="h-12 w-12 rounded-full object-cover" />
            </Link>
          )}
          <div className="min-w-0">
            <Link href={`/clubs/${tenantCode}`} className="block truncate text-lg font-bold" style={{ color: textColor }}>
              {name}
            </Link>
            {slug && (
              <Link href={`/clubs/${tenantCode}/${slug}`} className="block text-xs underline" style={{ color: accentColor }}>
                団体ページを見る
              </Link>
            )}
          </div>
        </div>

        <h1 className="mb-2 text-sm font-bold" style={{ color: textColor }}>{name}の予約スケジュール</h1>

        {eventsIntroText(tenant) && (
          <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
            {eventsIntroText(tenant)}
          </p>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-gray-400">現在受付中のイベントはありません。</p>
        ) : (
          <ReservationViewShowcase
            accentColor={accentColor}
            buttonLabel="予約する"
            viewStyle={page?.reserveViewStyle}
            events={events}
            tenantCode={tenantCode}
            showButton={false}
          />
        )}
      </div>
    </div>
  );
}
