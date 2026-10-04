'use client';

import Image from 'next/image';
import Link from 'next/link';

import { API_URL, EventSocialProof, formatEventSchedule } from '@/lib/api';
import { readableTextColor } from '@/lib/color';
import { getDefaultEventImage } from '@/lib/defaultImages';
import { imgUrl } from '@/lib/imgUrl';
import { useCalendarMonth } from '@/lib/useCalendarMonth';

export type UnifiedScheduleEvent = {
  id: string;
  title: string;
  heldAt: string;
  endAt?: string | null;
  location?: string | null;
  locationHint?: string | null;
  capacity?: number | null;
  reservedCount?: number | null;
  price?: number | null;
  priceMale?: number | null;
  priceFemale?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  socialProof?: EventSocialProof | null;
};

type Props = {
  events: UnifiedScheduleEvent[];
  tenantCode: string;
  viewStyle?: string | null;
  accentColor: string;
  cardBg: string;
};

function eventHref(tenantCode: string, eventId: string) {
  return `/e/${tenantCode}/${eventId}`;
}

function displayLocation(event: UnifiedScheduleEvent) {
  return event.locationHint || event.location || '場所は予約後にご案内';
}

function ActivityDots({ count }: { count: number }) {
  const shown = Math.min(count, 4);
  if (shown === 0) return null;
  const colors = ['bg-green-200', 'bg-blue-200', 'bg-yellow-200', 'bg-pink-200'];
  return (
    <div className="flex -space-x-1" aria-hidden="true">
      {Array.from({ length: shown }).map((_, index) => (
        <span
          key={index}
          className={`h-4 w-4 rounded-full border border-white ${colors[index % colors.length]}`}
        />
      ))}
    </div>
  );
}

function statusLabel(event: UnifiedScheduleEvent) {
  if (event.capacity == null) return '募集中';
  const remaining = event.capacity - (event.reservedCount ?? 0);
  if (remaining <= 0) return '満席';
  if (remaining <= 5) return `残り${remaining}席`;
  return '募集中';
}

function priceLabel(event: UnifiedScheduleEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `男性 ¥${event.priceMale.toLocaleString()}　女性 ¥${event.priceFemale.toLocaleString()}`;
  }
  if (event.price == null) return '';
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function CardView({ events, tenantCode, accentColor, cardBg }: Omit<Props, 'viewStyle'>) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2">
      {events.map((event) => {
        const image = imgUrl(event.imageUrl, API_URL);
        const status = statusLabel(event);
        const full = status === '満席';
        return (
          <Link
            key={event.id}
            href={eventHref(tenantCode, event.id)}
            className="block min-w-0 overflow-hidden rounded-xl active:opacity-70"
            style={{
              backgroundColor: cardBg,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              color: readableTextColor(cardBg),
            }}
          >
            <div className="relative aspect-square">
              <Image
                src={image || getDefaultEventImage(event.category)}
                alt={event.title}
                fill
                sizes="(min-width: 768px) 240px, 50vw"
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p
                  className="text-[13px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                >
                  {event.title}
                </p>
              </div>
              <span
                className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold ${full ? 'bg-gray-100 text-gray-500' : ''}`}
                style={full ? undefined : { backgroundColor: accentColor, color: readableTextColor(accentColor) }}
              >
                {status}
              </span>
            </div>

            <div className="space-y-1 px-2.5 pb-2.5 pt-2">
              <p className="text-[10px] opacity-60">
                {formatEventSchedule(event.heldAt, event.endAt)}
              </p>
              <ActivityDots count={event.reservedCount ?? 0} />
              <p>
                <span className="inline-block max-w-full truncate rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
                  {displayLocation(event)}
                </span>
              </p>
              {event.priceMale != null && event.priceFemale != null ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-500">
                    男性 ¥{event.priceMale.toLocaleString()}
                  </span>
                  <span className="rounded-full bg-pink-50 px-1.5 py-0.5 text-[9px] text-pink-500">
                    女性 ¥{event.priceFemale.toLocaleString()}
                  </span>
                </div>
              ) : priceLabel(event) ? (
                <span
                  className="inline-block rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ color: accentColor }}
                >
                  {priceLabel(event)}
                </span>
              ) : null}
              {event.socialProof?.text && (
                <p className="whitespace-pre-line text-right text-[9px] font-semibold leading-snug opacity-70">
                  {event.socialProof.text}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function monthLabel(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tokyo',
  });
}

function ThreadView({ events, tenantCode, accentColor, cardBg }: Omit<Props, 'viewStyle'>) {
  const groups = events.reduce<Record<string, UnifiedScheduleEvent[]>>((result, event) => {
    const key = monthLabel(event.heldAt);
    (result[key] ??= []).push(event);
    return result;
  }, {});

  return (
    <div className="min-w-0 space-y-5">
      {Object.entries(groups).map(([month, monthEvents]) => (
        <section key={month}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
            <h2 className="text-[15px] font-bold text-gray-800">{month}のスケジュール</h2>
          </div>
          <div className="space-y-2">
            {monthEvents.map((event) => {
              const status = statusLabel(event);
              const full = status === '満席';
              return (
                <Link
                  key={event.id}
                  href={eventHref(tenantCode, event.id)}
                  className="block min-w-0 overflow-hidden rounded-xl border border-gray-200 px-4 py-3 shadow-sm active:opacity-80"
                  style={{ backgroundColor: cardBg }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold leading-snug text-gray-900">{event.title}</p>
                      <div className="mt-2 space-y-1.5 text-[12px] font-medium leading-5 text-gray-700">
                        <p className="flex items-center gap-1.5"><span>🕐</span><span>{formatEventSchedule(event.heldAt, event.endAt)}</span></p>
                        <p className="flex items-center gap-1.5"><span>📍</span><span className="truncate">{displayLocation(event)}</span></p>
                        {priceLabel(event) && <p className="flex items-center gap-1.5"><span>💴</span><span>{priceLabel(event)}</span></p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 self-stretch flex-col items-end justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${full ? 'bg-gray-100 text-gray-400' : ''}`}
                        style={full ? undefined : { backgroundColor: `${accentColor}1a`, color: accentColor }}
                      >
                        {status}
                      </span>
                      {event.socialProof?.text && (
                        <span
                          className="max-w-[140px] whitespace-pre-line text-right text-[10px] font-bold leading-snug"
                          style={{ color: readableTextColor(cardBg), opacity: 0.72 }}
                        >
                          {event.socialProof.text}
                        </span>
                      )}
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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function timeRange(event: UnifiedScheduleEvent) {
  const start = new Date(event.heldAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
  if (!event.endAt) return start;
  const end = new Date(event.endAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
  return `${start}～${end}`;
}

function isLight(color: string) {
  const value = color.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return false;
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 180;
}

function CalendarView({ events, tenantCode, accentColor }: Omit<Props, 'viewStyle' | 'cardBg'>) {
  const firstEventDate = events[0]?.heldAt ?? null;
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth(firstEventDate);
  const eventsByDate: Record<string, UnifiedScheduleEvent[]> = {};
  const eventChipBg = isLight(accentColor) ? '#111827' : accentColor;

  for (const event of events) {
    const date = new Date(event.heldAt);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const key = date.getDate().toString();
      (eventsByDate[key] ??= []).push(event);
    }
  }

  return (
    <section className="mx-auto min-w-0 max-w-[480px] overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50" aria-label="前の月">
          <span aria-hidden="true">‹</span>
        </button>
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Schedule</p>
          <p className="text-lg font-bold text-gray-900">{year}年 {month + 1}月</p>
        </div>
        <button type="button" onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50" aria-label="次の月">
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-7 bg-gray-50">
          {WEEKDAYS.map((weekday, index) => (
            <div key={weekday} className={`py-2 text-center text-[11px] font-bold ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-white">
          {cells.map((day, index) => {
            const column = index % 7;
            const dayEvents = day ? (eventsByDate[day.toString()] ?? []) : [];
            const today = day ? isToday(day) : false;
            return (
              <div
                key={index}
                className={`min-h-[98px] min-w-0 overflow-hidden border-r border-t border-gray-100 p-1 align-top ${day ? 'bg-white' : 'bg-gray-50/70'}`}
                style={today ? { backgroundColor: `${accentColor}12` } : undefined}
              >
                {day && (
                  <>
                    <span
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${today ? 'text-white shadow-sm' : column === 0 ? 'text-red-400' : column === 6 ? 'text-blue-500' : 'text-gray-700'}`}
                      style={today ? { backgroundColor: accentColor } : undefined}
                    >
                      {day}
                    </span>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 1).map((event) => (
                        <Link
                          key={event.id}
                          href={eventHref(tenantCode, event.id)}
                          className="block overflow-hidden rounded-md px-1 py-1 text-white active:opacity-80"
                          style={{ backgroundColor: eventChipBg }}
                        >
                          <p className="truncate text-[9px] font-bold leading-tight">{displayLocation(event).trim().slice(0, 6)}</p>
                          <p className="mt-0.5 truncate text-[8px] font-semibold leading-none opacity-95">{timeRange(event)}</p>
                          <p className="mt-0.5 truncate text-[8px] font-semibold leading-none opacity-95">{priceLabel(event).replace(',', '')}</p>
                        </Link>
                      ))}
                      {dayEvents.length > 1 && <p className="text-center text-[9px] font-bold text-gray-400">+{dayEvents.length - 1}</p>}
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

export function UnifiedReservationSchedule(props: Props) {
  if (props.events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${props.accentColor}14` }}>
          <span className="text-2xl opacity-50" aria-hidden="true">▣</span>
        </div>
        <p className="mb-1 text-sm font-semibold text-gray-600">現在募集中のイベントはありません</p>
        <p className="text-xs text-gray-400">新しいイベントをお待ちください</p>
      </div>
    );
  }

  if (props.viewStyle === 'calendar') return <CalendarView {...props} />;
  if (props.viewStyle === 'thread') return <ThreadView {...props} />;
  return <CardView {...props} />;
}
