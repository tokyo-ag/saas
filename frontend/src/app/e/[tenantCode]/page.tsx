import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ActivityTicker } from '@/components/liff/ActivityTicker';
import { BellSchoolBreakdownSections } from '@/components/public/BellSchoolBreakdownSections';
import {
  UnifiedReservationSchedule,
  UnifiedScheduleEvent,
} from '@/components/public/UnifiedReservationSchedule';
import { SITE_URL, API_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';

// インカレサークルBELL専用のカスタマイズ（大学・専門学校の参加分布グラフ）
const BELL_TENANT_CODE = '11221185';

type TenantEventsData = {
  code?: string | null;
  name: string;
  description?: string | null;
  eventsSeoDescription?: string | null;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  liffId?: string | null;
  liffEventView?: string | null;
  pages?: Array<{ slug: string }>;
  events: UnifiedScheduleEvent[];
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
  backgroundOpacity?: number | null;
  navColor?: string | null;
  navOpacity?: number | null;
  textColor?: string | null;
  footerText?: string | null;
};

function hexToRgba(hex: string, opacityPercent: number) {
  const value = hex.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${opacityPercent / 100})`;
}

function parseReservationColors(page: TenantPageStyle | null) {
  let eventCardBg = '#ffffff';
  let reserveButtonColor: string | null = null;
  let reserveActionStyle: string | null = null;
  try {
    const settings = JSON.parse(page?.footerText ?? '{}') as Record<string, unknown>;
    if (typeof settings.reserveEventCardBg === 'string' && settings.reserveEventCardBg.trim()) {
      eventCardBg = settings.reserveEventCardBg.trim();
    }
    if (typeof settings.reserveButtonBgColor === 'string' && settings.reserveButtonBgColor.trim()) {
      reserveButtonColor = settings.reserveButtonBgColor.trim();
    }
    if (typeof settings.reserveActionStyle === 'string') {
      reserveActionStyle = settings.reserveActionStyle;
    }
  } catch {
    // Older pages may contain plain footer text rather than JSON settings.
  }
  return { eventCardBg, reserveButtonColor, reserveActionStyle };
}

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
  const image = imgUrl(tenant.linePictureUrl, API_URL) ?? `${SITE_URL}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/e/${tenantCode}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/e/${tenantCode}`,
      locale: 'ja_JP',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

function eventJsonLd(event: UnifiedScheduleEvent, tenantCode: string, tenantName: string, tenantIcon: string | null | undefined) {
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
  const image = imgUrl(event.imageUrl, API_URL) ?? imgUrl(tenantIcon, API_URL) ?? `${SITE_URL}/opengraph-image`;

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
    image: [image],
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

  const reservationColors = parseReservationColors(page);
  const accentColor = reservationColors.reserveButtonColor || page?.accentColor || '#06C755';
  const backgroundBase = page?.backgroundColor || '#F7F8FA';
  const backgroundColor = hexToRgba(backgroundBase, page?.backgroundOpacity ?? 100);
  const navBase = page?.navColor || '#ffffff';
  const navBg = hexToRgba(navBase, page?.navOpacity ?? 100);
  const textColor = page?.textColor || '#111827';
  const name = tenant.lineDisplayName || tenant.name;
  const icon = tenant.linePictureUrl;
  const events = tenant.events ?? [];
  const eventsJsonLd = events.map((event) => eventJsonLd(event, tenantCode, name, icon));
  const jsonLd = [breadcrumbJsonLd(tenantCode, name), ...eventsJsonLd];

  return (
    <div className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden sm:bg-gray-200" style={{ backgroundColor }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div
        className="mx-auto min-h-[100dvh] w-full min-w-0 max-w-[min(480px,100vw)] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl"
        style={{ backgroundColor }}
      >
        <header className="sticky top-0 z-10 border-b border-gray-100" style={{ backgroundColor: navBg }}>
          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-12 sm:pt-4">
            <Link href={`/clubs/${tenantCode}`} className="-m-2 flex min-w-0 items-center gap-2.5 rounded-xl p-2 active:bg-black/5">
              {icon ? (
                <Image
                  src={imgUrl(icon, API_URL)!}
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                  alt=""
                  unoptimized
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: `${accentColor}30` }} aria-hidden="true">🎉</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[18px] font-bold leading-tight tracking-tight" style={{ color: textColor }}>{name}</span>
                <span className="block text-[10px] leading-tight" style={{ color: textColor }}>団体説明</span>
              </span>
            </Link>
            {reservationColors.reserveActionStyle !== 'line' && (
              <Link
                href={`/liff/${tenantCode}/profile`}
                className="-m-2 flex shrink-0 items-center gap-1.5 rounded-xl p-2 active:bg-black/5"
                aria-label="マイページ"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <span className="text-right" style={{ color: textColor }}>
                  <span className="block text-[15px] font-bold leading-tight">マイページ</span>
                  <span className="block text-[10px] leading-tight">ログインする</span>
                </span>
              </Link>
            )}
          </div>
        </header>

        <div>
          <ActivityTicker tenantId={tenantCode} accentColor={accentColor} />
        </div>

        <h1 className="sr-only">{name}の予約スケジュール</h1>
        {eventsIntroText(tenant) && <p className="sr-only">{eventsIntroText(tenant)}</p>}

        <div className="p-2">
          <UnifiedReservationSchedule
            accentColor={accentColor}
            cardBg={reservationColors.eventCardBg}
            viewStyle={tenant.liffEventView}
            events={events}
            tenantCode={tenantCode}
          />
        </div>

        {tenantCode === BELL_TENANT_CODE && <BellSchoolBreakdownSections />}
      </div>
    </div>
  );
}
