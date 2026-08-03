'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, API_URL, formatDateShort, LiffEvent, LiffTenant, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import { useCalendarMonth } from '@/lib/useCalendarMonth';
import { initLiff, getLiffProfile } from '@/lib/liff';
import { EventCardSkeleton } from '@/components/liff/EventCardSkeleton';
import { useLiffTheme, readableTextColor } from '@/components/liff/LiffThemeProvider';
import { ActivityTicker } from '@/components/liff/ActivityTicker';

const SHOW_FEATURED_TENANTS = false;

function reserveHref(tenantId: string, eventId: string) {
  return `/liff/${tenantId}/events/${eventId}/reserve`;
}

function displayLocation(event: { location: string; locationHint?: string | null }, myStatus?: string) {
  if (myStatus === 'reserved' || myStatus === 'attended') return event.location;
  return event.locationHint || event.location;
}

function AvatarRow({ count, friends }: { count: number; friends?: { id: string; name: string | null }[] }) {
  const friendCount = friends?.length ?? 0;
  const total = count;
  const shown = Math.min(total, 4);
  if (shown === 0) return null;
  const colors = ['bg-green-200', 'bg-blue-200', 'bg-yellow-200', 'bg-pink-200'];
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1 shrink-0">
        {Array.from({ length: shown }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border border-white ${colors[i % colors.length]}`} />
        ))}
        {total > 4 && (
          <div className="w-4 h-4 rounded-full border border-white bg-gray-200 flex items-center justify-center">
            <span className="text-[7px] text-gray-500 font-bold">+{total - 4}</span>
          </div>
        )}
      </div>
      {friendCount > 0 && (
        <span className="text-[10px] font-medium text-green-600">友達{friendCount}人</span>
      )}
    </div>
  );
}

function ReservedBadge({ status, accentColor, className = '', style, compact = false }: { status?: string; accentColor: string; className?: string; style?: React.CSSProperties; compact?: boolean }) {
  if (!status) return null;
  const isWaitlisted = status === 'waitlisted';
  const bg = isWaitlisted ? '#fbbf24' : accentColor;
  const label = compact ? (isWaitlisted ? 'キャン待ち' : '予約済') : (isWaitlisted ? 'キャンセル待ち' : '予約済み');
  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded-full whitespace-nowrap ${className}`}
      style={{ backgroundColor: bg, color: readableTextColor(bg), fontSize: '9px', lineHeight: 1, padding: '2px 6px', ...style }}
    >
      {label}
    </span>
  );
}

function EventCard({ event, tenantId, accentColor, cardBg, myStatus }: { event: LiffEvent; tenantId: string; accentColor: string; cardBg: string; myStatus?: string }) {
  const img = imgUrl(event.imageUrl, API_URL);
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <Link
      href={reserveHref(tenantId, event.id)}
      className="block rounded-xl overflow-hidden active:opacity-70"
      style={{ backgroundColor: cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <div className="relative aspect-[1/1]">
        <Image src={img || DEFAULT_EVENT_IMAGE} alt={event.title} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-white font-bold text-[13px] leading-snug" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
            {event.title}
          </p>
        </div>
        {myStatus && <ReservedBadge status={myStatus} accentColor={accentColor} className="absolute top-2 left-2" />}
        {remaining !== null && remaining <= 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">満席</div>
        )}
        {remaining !== null && remaining > 0 && remaining <= 5 && (
          <div className="absolute top-2 right-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">残り{remaining}席</div>
        )}
      </div>

      {/* info */}
      <div className="px-2.5 pt-2 pb-2.5 space-y-1" style={{ color: readableTextColor(cardBg) }}>
        <p className="text-[10px] opacity-60">{formatDateShort(event.heldAt)}</p>
        <AvatarRow count={event.reservedCount} friends={event.friendAttendees} />
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{displayLocation(event, myStatus)}</span>
          {event.priceMale != null && event.priceFemale != null ? (
            <>
              <span className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">男¥{event.priceMale.toLocaleString()}</span>
              <span className="text-[9px] text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-full">女¥{event.priceFemale.toLocaleString()}</span>
            </>
          ) : event.price === 0 ? (
            <span className="text-[9px] bg-green-50 px-1.5 py-0.5 rounded-full font-medium" style={{ color: accentColor }}>無料</span>
          ) : (
            <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">¥{event.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatThreadDate(event: LiffEvent) {
  const start = new Date(event.heldAt);
  const date = start.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  });
  const startTime = start.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
  if (!event.endAt) return `${date} ${startTime}`;
  const endTime = new Date(event.endAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
  return `${date} ${startTime}-${endTime}`;
}

function threadMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tokyo',
  });
}

function threadPriceLabel(event: LiffEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `男性 ${event.priceMale.toLocaleString()}円 / 女性 ${event.priceFemale.toLocaleString()}円`;
  }
  return event.price === 0 ? '無料' : `${event.price.toLocaleString()}円`;
}

function threadStatusLabel(event: LiffEvent) {
  if (event.capacity == null) return '募集中';
  const remaining = event.capacity - event.reservedCount;
  if (remaining <= 0) return '満席';
  if (remaining <= 5) return `残り${remaining}席`;
  return '募集中';
}

function LiffThreadView({ events, tenantId, accentColor, cardBg, myStatusByEvent }: { events: LiffEvent[]; tenantId: string; accentColor: string; cardBg: string; myStatusByEvent?: Record<string, string> }) {
  const groups = events.reduce<Record<string, LiffEvent[]>>((acc, event) => {
    const key = threadMonthLabel(event.heldAt);
    (acc[key] ??= []).push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([month, monthEvents]) => (
        <section key={month}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
            <h2 className="text-[15px] font-bold text-gray-800">{month}のスケジュール</h2>
          </div>
          <div className="space-y-2">
            {monthEvents.map((event) => {
              const status = threadStatusLabel(event);
              const isFull = status === '満席';
              const myStatus = myStatusByEvent?.[event.id];
              const badgeLabel = myStatus === 'reserved' ? '予約済み'
                : myStatus === 'waitlisted' ? 'キャンセル待ち'
                : status;
              const badgeColorClass = myStatus === 'waitlisted' ? 'bg-yellow-100 text-yellow-700'
                : isFull && !myStatus ? 'bg-gray-100 text-gray-400'
                : 'bg-[#06C755]/10 text-[#06C755]';
              return (
                <Link
                  key={event.id}
                  href={reserveHref(tenantId, event.id)}
                  className="block rounded-xl border border-gray-200 px-4 py-3 shadow-sm active:opacity-80"
                  style={{ backgroundColor: cardBg }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold leading-snug text-gray-900">{event.title}</p>
                      <div className="mt-2 space-y-1.5 text-[12px] font-medium leading-5 text-gray-700">
                        <p className="flex items-center gap-1.5"><span>🕐</span><span>{formatThreadDate(event)}</span></p>
                        <p className="flex items-center gap-1.5"><span>📍</span><span className="truncate">{displayLocation(event, myStatusByEvent?.[event.id])}</span></p>
                        <p className="flex items-center gap-1.5 flex-wrap">
                          {event.capacity != null && (
                            <span className="flex items-center gap-1.5">👥<span>{event.reservedCount}/{event.capacity}人</span></span>
                          )}
                          <span className="flex items-center gap-1.5">💴<span>{threadPriceLabel(event)}</span></span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${badgeColorClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function TenantCard({ tenant }: { tenant: PublicTenant }) {
  const name = tenant.name ?? tenant.lineDisplayName;
  return (
    <Link
      href={`/liff/${tenant.id}`}
      className="flex items-center gap-3 bg-white/85 rounded-xl px-3 py-3 active:opacity-70"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
    >
      {tenant.linePictureUrl ? (
        <Image src={tenant.linePictureUrl} alt={name} width={40} height={40} className="w-10 h-10 rounded-full shrink-0 object-cover" unoptimized />
      ) : (
        <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-[#06C755] to-[#05a847] flex items-center justify-center">
          <span className="text-white font-bold text-sm">{name[0]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{name}</p>
      </div>
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

const WEEKDAYS_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

function eventTimeRange(event: LiffEvent) {
  const start = new Date(event.heldAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
  if (!event.endAt) return start;
  const end = new Date(event.endAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
  return `${start}-${end}`;
}

function eventDateLabel(event: LiffEvent) {
  return new Date(event.heldAt).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  });
}

function eventPriceLabel(event: LiffEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return event.priceMale === event.priceFemale
      ? `${event.priceMale.toLocaleString()}円`
      : `男${event.priceMale.toLocaleString()}円 / 女${event.priceFemale.toLocaleString()}円`;
  }
  return event.price === 0 ? '無料' : `${event.price.toLocaleString()}円`;
}

function isLightHexColor(color: string) {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function LiffCalendarView({ events, tenantId, accentColor, cardBg }: { events: LiffEvent[]; tenantId: string; accentColor: string; cardBg: string }) {
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth();

  const eventsByDate: Record<string, LiffEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.heldAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString();
      (eventsByDate[key] ??= []).push(ev);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
      {/* 月ナビ */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: accentColor }}>
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-bold text-white tracking-wide">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {WEEKDAYS_SHORT.map((w, i) => (
          <div key={w} className={`py-2 text-center text-[11px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7" style={{ backgroundColor: cardBg }}>
        {cells.map((day, i) => {
          const col = i % 7;
          const dayEvents = day ? (eventsByDate[day.toString()] ?? []) : [];
          const todayCell = day ? isToday(day) : false;

          return (
            <div
              key={i}
              className={`border-b border-r border-gray-100 p-1 align-top min-h-[80px] ${!day ? 'bg-black/[0.03]' : ''}`}
              style={todayCell ? { backgroundColor: `${accentColor}18` } : undefined}
            >
              {day && (
                <>
                  <span className={`flex w-6 h-6 items-center justify-center rounded-full text-[11px] font-semibold mx-auto mb-1 ${
                    todayCell ? 'text-white shadow-sm'
                      : col === 0 ? 'text-red-400'
                      : col === 6 ? 'text-blue-400'
                      : 'text-gray-600'
                  }`}
                    style={todayCell ? { backgroundColor: accentColor } : undefined}>
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => {
                      const startTime = new Date(ev.heldAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
                      return (
                        <Link
                          key={ev.id}
                          href={reserveHref(tenantId, ev.id)}
                          className="block rounded-md px-1 py-0.5 active:opacity-70"
                          style={{ backgroundColor: accentColor }}
                        >
                          <p className="text-[8px] font-bold text-white truncate leading-tight">{ev.title}</p>
                          <p className="text-[8px] text-white/80 leading-none mt-0.5">{startTime}</p>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiffCalendarCard({ events, tenantId, accentColor, myStatusByEvent }: { events: LiffEvent[]; tenantId: string; accentColor: string; myStatusByEvent?: Record<string, string> }) {
  const firstEventDate = events[0]?.heldAt ?? null;
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth(firstEventDate);
  const eventsByDate: Record<string, LiffEvent[]> = {};
  const eventChipBg = isLightHexColor(accentColor) ? '#111827' : accentColor;
  const eventChipText = '#ffffff';
  const monthEvents = events
    .filter((event) => {
      const date = new Date(event.heldAt);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .sort((a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime());

  for (const event of monthEvents) {
    const date = new Date(event.heldAt);
    const key = date.getDate().toString();
    (eventsByDate[key] ??= []).push(event);
  }

  return (
    <section className="mx-auto max-w-[480px] rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
          aria-label="前の月"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Schedule</p>
          <p className="text-lg font-bold text-gray-900">{year}年 {month + 1}月</p>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
          aria-label="次の月"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-7 bg-gray-50">
          {WEEKDAYS_SHORT.map((weekday, index) => (
            <div
              key={weekday}
              className={`py-2 text-center text-[11px] font-bold ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-500' : 'text-gray-500'}`}
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-white">
          {cells.map((day, index) => {
            const column = index % 7;
            const dayEvents = day ? (eventsByDate[day.toString()] ?? []) : [];
            const todayCell = day ? isToday(day) : false;

            return (
              <div
                key={index}
                className={`min-h-[98px] border-t border-r border-gray-100 p-1 align-top ${!day ? 'bg-gray-50/70' : 'bg-white'}`}
                style={todayCell ? { backgroundColor: `${accentColor}12` } : undefined}
              >
                {day && (
                  <>
                    <span
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        todayCell
                          ? 'text-white shadow-sm'
                          : column === 0
                            ? 'text-red-400'
                            : column === 6
                              ? 'text-blue-500'
                              : 'text-gray-700'
                      }`}
                      style={todayCell ? { backgroundColor: accentColor } : undefined}
                    >
                      {day}
                    </span>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 1).map((event) => {
                        const locationPreview = displayLocation(event, myStatusByEvent?.[event.id]).trim().slice(0, 6);
                        return (
                          <Link
                            key={event.id}
                            href={reserveHref(tenantId, event.id)}
                            className="block overflow-hidden rounded-md px-1 py-1 active:opacity-80"
                            style={{ backgroundColor: eventChipBg, color: eventChipText }}
                          >
                            {myStatusByEvent?.[event.id] && (
                              <ReservedBadge
                                status={myStatusByEvent[event.id]}
                                accentColor={accentColor}
                                compact
                                className="mb-0.5 leading-tight"
                                style={{ fontSize: '8px', padding: '2px 3px' }}
                              />
                            )}
                            <p className="truncate text-[9px] font-bold leading-tight">{locationPreview}</p>
                            <p className="mt-0.5 truncate text-[8px] font-semibold leading-none opacity-95">{eventTimeRange(event).replace('-', '~')}</p>
                            <p className="mt-0.5 truncate text-[8px] font-semibold leading-none opacity-95">{eventPriceLabel(event).replace(',', '')}</p>
                          </Link>
                        );
                      })}
                      {dayEvents.length > 1 && (
                        <p className="text-center text-[9px] font-bold text-gray-400">+{dayEvents.length - 1}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function LiffTopPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const theme = useLiffTheme();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [events, setEvents] = useState<LiffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherTenants, setOtherTenants] = useState<PublicTenant[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const [myStatusByEvent, setMyStatusByEvent] = useState<Record<string, string>>({});
  const [myPictureUrl, setMyPictureUrl] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function init() {
      const tenantCacheKey = `liff_tenant_${tenantId}`;
      const eventsCacheKey = `liff_events_${tenantId}`;

      api.liff.recordAccess(tenantId).catch(() => {});
      let notFound = false;
      const t = await api.liff.tenant(tenantId).catch((err: any) => {
        if (err?.status === 404) notFound = true;
        return null;
      });
      if (t) {
        setTenant(t);
        localStorage.setItem(tenantCacheKey, JSON.stringify(t));
      } else if (notFound) {
        // 団体が削除済みなど恒久的に存在しない場合は、古いキャッシュを
        // 表示し続けず、はっきりと「見つかりません」を出す。
        localStorage.removeItem(tenantCacheKey);
        localStorage.removeItem(eventsCacheKey);
        setTenantNotFound(true);
        setLoading(false);
        return;
      } else {
        const cached = localStorage.getItem(tenantCacheKey);
        if (cached) setTenant(JSON.parse(cached) as LiffTenant);
      }

      try {
        const eventsNoFriend = await api.liff.events(tenantId);
        setEvents(eventsNoFriend);
        localStorage.setItem(eventsCacheKey, JSON.stringify(eventsNoFriend));
      } catch {
        const cached = localStorage.getItem(eventsCacheKey);
        if (cached) {
          setEvents(JSON.parse(cached) as LiffEvent[]);
          setIsOffline(true);
        }
      }
      setLoading(false);

      // 主催者向け画面では他団体レコメンドを非表示にする。必要になったらフラグで戻す。
      if (SHOW_FEATURED_TENANTS) {
        const allTenants = await api.public.tenants().catch(() => []);
        setOtherTenants(allTenants.filter((t) => t.id !== tenantId));
      }

      const ok = await initLiff();
      const lineProfile = ok ? await getLiffProfile().catch(() => null) : null;
      if (lineProfile?.pictureUrl) setMyPictureUrl(lineProfile.pictureUrl);
      if (lineProfile?.userId) setIsLoggedIn(true);
      const uid = lineProfile?.userId ?? `demo-${tenantId}`;
      if (uid && lineProfile?.userId) {
        const eventsWithFriends = await api.liff
          .events(tenantId, true)
          .catch(() => null);
        if (eventsWithFriends) setEvents(eventsWithFriends);

        const myReservations = await api.liff.myReservations(tenantId).catch(() => []);
        setMyStatusByEvent(
          Object.fromEntries(myReservations.map((r) => [r.event.id, r.status])),
        );
      }
      if (lineProfile?.userId) {
        api.liff.syncLineProfile(tenantId, lineProfile.userId, {
          lineDisplayName: lineProfile.displayName,
          linePictureUrl: lineProfile.pictureUrl,
        }).catch(() => {});
      }
    }
    init();

  }, [tenantId]);

  if (tenantNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3 bg-gray-50">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">🔍</div>
        <p className="text-lg font-bold text-gray-900">団体のページが見つかりません</p>
        <p className="text-sm text-gray-500">この団体は削除されたか、URLが変更された可能性があります。</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen sm:bg-gray-200 animate-page-in" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="mx-auto w-full max-w-[480px] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl" style={{ backgroundColor: theme.backgroundColor, minHeight: '100dvh' }}>
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-gray-100" style={{ backgroundColor: theme.navBg }}>
          <div className="flex items-center justify-between gap-2 px-4 pt-12 pb-3 sm:pt-4">
            <Link href={`/clubs/${tenantId}`} className="flex min-w-0 items-center gap-2.5 -m-2 p-2 rounded-xl active:bg-black/5">
              {(tenant?.linePictureUrl ?? tenant?.iconUrl) ? (
                <Image src={(tenant?.linePictureUrl ?? tenant?.iconUrl)!} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" unoptimized />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base" style={{ backgroundColor: `${theme.accentColor}30` }}>🎉</div>
              )}
              <div className="min-w-0">
                <p className="text-[18px] font-bold text-gray-900 tracking-tight truncate leading-tight">
                  {tenant?.name ?? tenant?.lineDisplayName ?? 'Home'}
                </p>
                <p className="text-[10px] text-gray-800 leading-tight">団体説明</p>
              </div>
            </Link>
            {tenant?.reserveActionStyle !== 'line' && (
              <Link
                href={`/liff/${tenantId}/profile`}
                className="flex shrink-0 items-center gap-1.5 -m-2 p-2 rounded-xl active:bg-black/5"
                aria-label="マイページ"
              >
                {myPictureUrl ? (
                  <Image src={myPictureUrl} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" unoptimized />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[15px] font-bold text-gray-900 leading-tight">マイページ</p>
                  <p className="text-[10px] text-gray-800 leading-tight">{isLoggedIn ? 'ログイン中' : 'ログインする'}</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {isOffline && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center">
            現在サーバーに接続できません。以前に読み込んだ情報を表示しています。
          </div>
        )}

        {tenant?.activityTickerEnabled !== false && (
          <ActivityTicker tenantId={tenantId} accentColor={theme.accentColor} />
        )}

        <div className="p-2">
          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.accentColor}14` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-sm mb-1">現在募集中のイベントはありません</p>
              <p className="text-gray-400 text-xs">新しいイベントをお待ちください</p>
            </div>
          ) : tenant?.liffEventView === 'calendar' ? (
            <LiffCalendarCard events={events} tenantId={tenantId} accentColor={theme.accentColor} myStatusByEvent={myStatusByEvent} />
          ) : tenant?.liffEventView === 'thread' ? (
            <LiffThreadView events={events} tenantId={tenantId} accentColor={theme.accentColor} cardBg={theme.eventCardBg || '#ffffff'} myStatusByEvent={myStatusByEvent} />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {events.map((ev) => <EventCard key={ev.id} event={ev} tenantId={tenantId} accentColor={theme.accentColor} cardBg={theme.eventCardBg || '#ffffff'} myStatus={myStatusByEvent[ev.id]} />)}
            </div>
          )}

          {/* COMIU注目の団体！ */}
          {SHOW_FEATURED_TENANTS && otherTenants.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-1 mb-3">
                <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor }} />
                <p className="text-[13px] font-bold text-gray-800">COMIU注目の団体！</p>
              </div>
              <div className="flex flex-col gap-2">
                {otherTenants.map((t) => <TenantCard key={t.id} tenant={t} />)}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
