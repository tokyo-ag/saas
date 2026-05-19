import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

type EventDetail = {
  id: string;
  title: string;
  description?: string;
  heldAt: string;
  endAt?: string | null;
  location: string;
  locationUrl?: string;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  capacity?: number | null;
  reservedCount: number;
  imageUrl?: string;
  iconUrl?: string;
  category?: string | null;
  tags?: string[];
  tenantCode: string;
  tenantName: string;
  tenantIconUrl?: string | null;
};

async function fetchEvent(eventId: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/events/${eventId}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function imgSrc(url?: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

export async function generateMetadata({ params }: { params: { tenantCode: string; eventId: string } }): Promise<Metadata> {
  const event = await fetchEvent(params.eventId);
  if (!event) return { title: 'イベントが見つかりません' };

  const description = event.description
    ? event.description.slice(0, 120).replace(/\n/g, ' ')
    : `${event.location}で開催。${event.price === 0 ? '参加費無料' : `参加費¥${event.price.toLocaleString()}`}`;

  const ogImage = imgSrc(event.imageUrl) ?? imgSrc(event.iconUrl);

  return {
    title: `${event.title} | ${event.tenantName}`,
    description,
    openGraph: {
      title: event.title,
      description,
      url: `${SITE_URL}/e/${event.tenantCode}/${event.id}`,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: event.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PublicEventPage({ params }: { params: { tenantCode: string; eventId: string } }) {
  const event = await fetchEvent(params.eventId);

  if (!event || event.tenantCode !== params.tenantCode) notFound();

  const liffUrl = `${SITE_URL}/liff/${event.tenantCode}/events/${event.id}`;
  const isFull = event.capacity != null && event.reservedCount >= event.capacity;
  const spotsLeft = event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-[#06C755] font-bold text-lg tracking-tight">COMIU</Link>
        <Link href={liffUrl} className="rounded-full bg-[#06C755] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#05a847]">
          LINEで予約
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* バナー画像 */}
        {event.imageUrl && (
          <div className="overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
            <img src={imgSrc(event.imageUrl)!} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* タイトル・主催者 */}
        <div>
          {event.category && (
            <span className="inline-block mb-2 rounded-full bg-[#06C755]/10 px-2.5 py-0.5 text-xs font-medium text-[#06C755]">
              {event.category}
            </span>
          )}
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{event.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            {imgSrc(event.tenantIconUrl) && (
              <img src={imgSrc(event.tenantIconUrl)!} alt="" className="w-6 h-6 rounded-full object-cover" />
            )}
            <span className="text-sm text-gray-500">{event.tenantName}</span>
          </div>
          {event.tags && event.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 詳細情報 */}
        <div className="rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100 shadow-sm">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div className="text-sm text-gray-800">
              <p>{formatDate(event.heldAt)}</p>
              {event.endAt && <p className="text-gray-500">〜 {formatDate(event.endAt)}</p>}
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div className="text-sm text-gray-800">
              {event.locationUrl ? (
                <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline">{event.location}</a>
              ) : (
                <span>{event.location}</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 text-gray-400 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
              </svg>
            </span>
            <div className="text-sm text-gray-800">
              {event.priceMale != null && event.priceFemale != null ? (
                <p>男性 ¥{event.priceMale.toLocaleString()} / 女性 ¥{event.priceFemale.toLocaleString()}</p>
              ) : (
                <p>{event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`}</p>
              )}
            </div>
          </div>

          {event.capacity != null && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 text-gray-400 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <p className="text-sm text-gray-800">
                {isFull ? (
                  <span className="text-red-500 font-medium">満員</span>
                ) : (
                  <span>{event.reservedCount} / {event.capacity}人{spotsLeft != null && spotsLeft <= 5 && <span className="ml-2 text-amber-500 font-medium">残り{spotsLeft}名</span>}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* 説明 */}
        {event.description && (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">イベント詳細</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{event.description}</p>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl bg-white border border-gray-200 px-4 py-5 shadow-sm text-center space-y-3">
          <p className="text-sm text-gray-500">参加にはLINEアカウントが必要です</p>
          <Link
            href={liffUrl}
            className={`block w-full rounded-xl py-3.5 text-sm font-bold text-white transition-colors ${
              isFull ? 'bg-gray-400 pointer-events-none' : 'bg-[#06C755] hover:bg-[#05a847]'
            }`}
          >
            {isFull ? '満員のため受付終了' : 'LINEで予約する'}
          </Link>
          <p className="text-xs text-gray-400">
            このイベントは <a href={SITE_URL} className="text-[#06C755] underline">COMIU</a> で管理されています
          </p>
        </div>
      </main>
    </div>
  );
}
