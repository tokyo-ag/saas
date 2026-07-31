'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { API_URL, PublicEvent, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import PublicFooter from '@/components/public/PublicFooter';

type HomeClientProps = {
  initialEvents: PublicEvent[];
  initialTenants: PublicTenant[];
  showHomePrompt: boolean;
  initialSearchQuery?: string;
};

const DISCOVERY_LINKS = [
  { href: '/events/meetup', label: '交流会' },
  { href: '/sports/badminton', label: 'バドミントン' },
  { href: '/sports/futsal', label: 'フットサル' },
  { href: '/sports/basketball', label: 'バスケ' },
  { href: '/sports/volleyball', label: 'バレー' },
];

const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  meetup: ['交流会', '社会人交流会', '友達作り', 'カフェ会', '飲み会'],
  badminton: ['バドミントン', 'バド'],
  futsal: ['フットサル', 'サッカー'],
  basketball: ['バスケ', 'バスケットボール', 'basketball'],
  volleyball: ['バレー', 'バレーボール', 'volleyball'],
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 mb-3">
      <span className="w-1 h-4 rounded-full bg-[#06C755] shrink-0" />
      <h2 className="text-[13px] font-bold text-gray-800">{title}</h2>
    </div>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function eventHref(event: PublicEvent) {
  return event.tenantCode ? `/e/${event.tenantCode}/${event.id}` : '/';
}

function priceLabel(event: PublicEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `¥${Math.min(event.priceMale, event.priceFemale).toLocaleString()}〜`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function EventCard({
  event,
  showViews,
  compact,
}: {
  event: PublicEvent;
  showViews?: boolean;
  compact?: boolean;
}) {
  const img = imgUrl(event.imageUrl, API_URL);
  const remaining =
    event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <Link
      href={eventHref(event)}
      className={`flex-shrink-0 ${
        compact ? 'w-[92px] md:w-32' : 'w-[118px] md:w-44'
      } overflow-hidden rounded-xl block relative bg-white`}
    >
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        {img ? (
          <Image
            src={img}
            alt={event.title}
            fill
            sizes={compact ? '128px' : '176px'}
            className="object-cover"
          />
        ) : (
          <Image
            src={DEFAULT_EVENT_IMAGE}
            alt={event.title}
            fill
            sizes={compact ? '128px' : '176px'}
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        {remaining !== null && remaining <= 0 && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            満席
          </div>
        )}
        {showViews && event.viewCount > 0 && (
          <div className="absolute top-1 left-1 bg-black/45 text-white text-[9px] px-1.5 py-0.5 rounded-full">
            閲覧 {event.viewCount}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <p
            className="text-white font-bold text-[11px] leading-snug line-clamp-2 mb-1"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          >
            {event.title}
          </p>
          <div className="flex items-center justify-between gap-1">
            <span className="text-white/80 text-[9px] truncate">
              {fmtDate(event.heldAt)}
            </span>
            <span className="text-white/95 text-[9px] font-semibold shrink-0">
              {priceLabel(event)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RankingCard({ tenant, rank }: { tenant: PublicTenant; rank: number }) {
  const displayName = tenant.name ?? tenant.lineDisplayName;
  const href = tenant.code ? `/clubs/${tenant.code}` : `/liff/${tenant.id}`;

  return (
    <Link
      href={href}
      className="flex-shrink-0 w-36 bg-white rounded-xl p-3 flex flex-col items-center gap-2 relative block"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <span className="absolute top-2 left-3 text-xs font-bold text-[#06C755]">
        No.{rank + 1}
      </span>
      {tenant.linePictureUrl ? (
        <Image
          src={tenant.linePictureUrl}
          alt={displayName}
          width={56}
          height={56}
          className="w-14 h-14 rounded-full object-cover mt-3 border-2 border-gray-100"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#06C755] to-[#047a35] mt-3 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {displayName.slice(0, 1)}
          </span>
        </div>
      )}
      <p className="text-[12px] font-semibold text-gray-800 text-center leading-snug line-clamp-2">
        {displayName}
      </p>
    </Link>
  );
}

function HScroll({
  children,
  gap = 'gap-3',
}: {
  children: React.ReactNode;
  gap?: string;
}) {
  return (
    <div className={`flex ${gap} overflow-x-auto pl-4 pr-0 pb-2 scrollbar-hide`}>
      {children}
    </div>
  );
}

export default function HomeClient({
  initialEvents,
  initialTenants,
  showHomePrompt,
  initialSearchQuery = '',
}: HomeClientProps) {
  const events = initialEvents;
  const tenants = initialTenants;
  const [searchOpen, setSearchOpen] = useState(initialSearchQuery.trim().length > 0);
  const [query, setQuery] = useState(initialSearchQuery);

  function limitPerTenant(list: PublicEvent[], max = 2) {
    const counts: Record<string, number> = {};
    return list.filter((ev) => {
      counts[ev.tenantId] = (counts[ev.tenantId] ?? 0) + 1;
      return counts[ev.tenantId] <= max;
    });
  }

  const hotEvents = limitPerTenant(
    [...events].sort((a, b) => b.tenantAccessCount - a.tenantAccessCount),
  ).slice(0, 10);

  const byDate = limitPerTenant(
    [...events].sort(
      (a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime(),
    ),
  );

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return events;
    return events.filter((ev) => {
      const categoryTerms = ev.category
        ? CATEGORY_SEARCH_TERMS[ev.category] ?? [ev.category]
        : [];
      return [
        ev.title,
        ev.locationHint || ev.location,
        ev.tenant.lineDisplayName ?? ev.tenant.name,
        ev.category ?? '',
        ...categoryTerms,
        ...ev.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [events, query]);

  return (
    <>
      {searchOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-gray-100">
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="イベント名・場所・主催者で検索"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setSearchOpen(false);
                setQuery('');
              }}
              className="text-[#06C755] text-sm font-medium shrink-0"
            >
              キャンセル
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {query && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-gray-500 text-sm font-medium">
                  「{query}」に一致するイベントがありません
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  別のキーワードで試してみてください
                </p>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {searchResults.map((ev) => (
                  <EventCard key={ev.id} event={ev} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F5F5F5] pb-28">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#06C755] leading-none">
              COMIU
            </p>
            <p className="text-[15px] font-bold text-gray-900 tracking-tight mt-1 leading-tight">
              東京の20代向けサークル・交流イベント
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
              LINEで探して、そのまま参加予約
            </p>
          </div>
        </div>

        {showHomePrompt && (
          <div className="mx-4 mt-3 bg-[#06C755]/10 border border-[#06C755]/20 rounded-xl px-4 py-3 text-center">
            <p className="text-[13px] font-semibold text-[#047a35]">
              参加したい団体を選んでください
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              イベントや団体をタップすると団体ページへ進めます
            </p>
          </div>
        )}

        <h1 className="sr-only">
          東京の20代向けサークル・交流イベント検索 | COMIU
        </h1>

        <div className="pt-4 pb-1">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {DISCOVERY_LINKS.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="flex-none bg-white border border-gray-200 rounded-full px-3.5 py-2 active:bg-gray-50 transition-colors"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <span className="text-[12px] font-semibold text-gray-700 whitespace-nowrap">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-5 pb-2">
          <SectionHeader title="人気のイベント" />
          {hotEvents.length === 0 ? (
            <p className="text-xs text-gray-400 px-4">
              今月のイベントはまだありません
            </p>
          ) : (
            <HScroll gap="gap-1">
              {hotEvents.map((ev) => (
                <EventCard key={ev.id} event={ev} showViews compact />
              ))}
            </HScroll>
          )}
        </div>

        <div className="pt-4 pb-2">
          <SectionHeader title="開催日が近いイベント" />
          {byDate.length === 0 ? (
            <p className="text-xs text-gray-400 px-4">
              開催予定のイベントはありません
            </p>
          ) : (
            <HScroll gap="gap-1">
              {byDate.map((ev) => (
                <EventCard key={ev.id} event={ev} compact />
              ))}
            </HScroll>
          )}
        </div>

        <div className="pt-4 pb-2">
          <SectionHeader title="注目の団体" />
          {tenants.length === 0 ? (
            <p className="text-xs text-gray-400 px-4">団体がありません</p>
          ) : (
            <HScroll gap="gap-2">
              {tenants.slice(0, 8).map((t, i) => (
                <RankingCard key={t.id} tenant={t} rank={i} />
              ))}
            </HScroll>
          )}
        </div>

        <div
          className="mx-4 mt-6 mb-2 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #06C755 0%, #047a35 100%)',
          }}
        >
          <div className="px-5 py-5">
            <p className="text-white font-bold text-[15px] leading-snug">
              あなたのサークルも
              <br />
              COMIUで募集しませんか
            </p>
            <p className="text-white/80 text-[12px] mt-1.5">
              フリープランは無料。まずはイベント掲載から始められます。
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/register"
                className="bg-white text-[#06C755] font-bold text-sm px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                無料で始める
              </Link>
              <Link
                href="/pricing"
                className="text-white/70 text-xs hover:text-white underline"
              >
                料金を見る
              </Link>
              <Link
                href="/login"
                className="text-white/70 text-xs hover:text-white underline"
              >
                ログイン
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <PublicFooter />
        </div>
      </div>

    </>
  );
}
