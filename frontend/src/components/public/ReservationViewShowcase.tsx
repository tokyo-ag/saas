'use client';

import Link from 'next/link';
import { API_URL, formatDateShort } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { useCalendarMonth } from '@/lib/useCalendarMonth';

export type ReservationShowcaseEvent = {
  id: string;
  title: string;
  heldAt: string;
  endAt?: string | null;
  location?: string | null;
  capacity?: number | null;
  reservedCount?: number | null;
  price?: number | null;
  priceMale?: number | null;
  priceFemale?: number | null;
  imageUrl?: string | null;
};

type ReservationViewShowcaseProps = {
  accentColor: string;
  buttonLabel: string;
  href?: string;
  className?: string;
  viewStyle?: string | null;
  events?: ReservationShowcaseEvent[];
  tenantCode?: string;
  eventTitleColor?: string;
  eventDateColor?: string;
  eventMetaColor?: string;
  eventCardBg?: string;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const DUMMY_EVENT_DAYS = new Set([5, 12]);
const DEFAULT_ACCENT = '#06C755';

function parseHexColor(color: string | null | undefined) {
  const raw = (color || DEFAULT_ACCENT).trim();
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map((c) => c + c).join('')
    : match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { hex: `#${hex}`, r, g, b };
}

function readableAccent(color: string | null | undefined) {
  const parsed = parseHexColor(color);
  const accent = parsed?.hex || color || DEFAULT_ACCENT;
  if (!parsed) return { accent, text: '#FFFFFF', border: accent };

  const luminance = (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;
  const isLight = luminance > 0.72;
  return {
    accent,
    text: isLight ? '#111827' : '#FFFFFF',
    border: isLight ? 'rgba(17,24,39,0.22)' : accent,
  };
}

function eventHref(event: ReservationShowcaseEvent, tenantCode?: string, fallbackHref?: string) {
  return tenantCode ? `/e/${tenantCode}/${event.id}` : fallbackHref || '#';
}

function eventTime(event: ReservationShowcaseEvent) {
  return new Date(event.heldAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function eventDate(event: ReservationShowcaseEvent) {
  return formatDateShort(event.heldAt);
}

function eventStatus(event: ReservationShowcaseEvent) {
  if (!event.capacity) return '募集中';
  const remaining = event.capacity - (event.reservedCount ?? 0);
  if (remaining <= 0) return '満席';
  if (remaining <= 5) return `残り${remaining}席`;
  return '募集中';
}

function eventPrice(event: ReservationShowcaseEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `男性 ${event.priceMale.toLocaleString()}円 / 女性 ${event.priceFemale.toLocaleString()}円`;
  }
  if (event.price == null) return '';
  return event.price === 0 ? '無料' : `${event.price.toLocaleString()}円`;
}

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tokyo',
  });
}

function EmptyEvents({ accentColor }: { accentColor: string }) {
  const visible = readableAccent(accentColor);
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
      <p className="text-sm font-bold text-gray-500">現在募集中のイベントはありません</p>
      <p className="mt-1 text-xs text-gray-400">新しい日程が公開されるとここに表示されます</p>
      <span className="mx-auto mt-4 block h-1.5 w-14 rounded-full" style={{ backgroundColor: visible.accent }} />
    </div>
  );
}

function CalendarPreview({
  accentColor,
  events,
  tenantCode,
  fallbackHref,
  eventTitleColor,
  eventDateColor,
  cardBg,
}: {
  accentColor: string;
  events?: ReservationShowcaseEvent[];
  tenantCode?: string;
  fallbackHref?: string;
  eventTitleColor?: string;
  eventDateColor?: string;
  cardBg?: string;
}) {
  const visible = readableAccent(accentColor);
  const actualEvents = events ?? [];
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth(actualEvents[0]?.heldAt);
  const byDate: Record<string, ReservationShowcaseEvent[]> = {};
  for (const event of actualEvents) {
    const date = new Date(event.heldAt);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const key = date.getDate().toString();
      (byDate[key] ??= []).push(event);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: visible.accent }}>
        <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-bold text-white tracking-wide">{year}年 {month + 1}月</span>
        <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-2 text-center text-[11px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7" style={{ backgroundColor: cardBg || '#ffffff' }}>
        {cells.map((day, i) => {
          const col = i % 7;
          const today = day ? isToday(day) : false;
          const dayEvents = day ? (byDate[day.toString()] ?? []) : [];
          const hasDummyEvent = !events && day ? DUMMY_EVENT_DAYS.has(day) : false;
          return (
            <div
              key={i}
              className={`border-b border-r border-gray-100 p-1 min-h-[56px] ${
                !day ? 'bg-black/[0.03]' : ''
              }`}
              style={today ? { backgroundColor: `${visible.accent}18` } : undefined}
            >
              {day && (
                <>
                  <span
                    className={`flex w-6 h-6 items-center justify-center rounded-full text-[11px] font-semibold mx-auto mb-1 ${
                      today ? 'text-white shadow-sm' : col === 0 ? 'text-red-400' : col === 6 ? 'text-blue-400' : 'text-gray-600'
                    }`}
                    style={today ? { backgroundColor: visible.accent } : undefined}
                  >
                    {day}
                  </span>
                  {dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={eventHref(event, tenantCode, fallbackHref)}
                      className="mb-0.5 block rounded px-1 py-0.5"
                      style={{ backgroundColor: visible.accent }}
                    >
                      <p className="truncate text-[8px] font-bold leading-tight" style={{ color: eventTitleColor || visible.text }}>{event.title}</p>
                      <p className="text-[7px] leading-none opacity-75" style={{ color: eventDateColor || visible.text }}>{eventTime(event)}</p>
                    </Link>
                  ))}
                  {hasDummyEvent && (
                    <div className="rounded px-1 py-0.5" style={{ backgroundColor: visible.accent }}>
                      <p className="text-[8px] font-bold text-white truncate leading-tight">イベント</p>
                      <p className="text-[7px] text-white/80 leading-none">19:00</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardMini({
  accentColor,
  events,
  tenantCode,
  fallbackHref,
  eventTitleColor,
  eventDateColor,
  eventMetaColor,
  cardBg,
}: {
  accentColor: string;
  events?: ReservationShowcaseEvent[];
  tenantCode?: string;
  fallbackHref?: string;
  eventTitleColor?: string;
  eventDateColor?: string;
  eventMetaColor?: string;
  cardBg?: string;
}) {
  const visible = readableAccent(accentColor);
  if (events) {
    if (events.length === 0) return <EmptyEvents accentColor={accentColor} />;
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {events.map((event) => {
          const image = imgUrl(event.imageUrl, API_URL);
          const status = eventStatus(event);
          const full = status === '満席';
          const price = eventPrice(event);
          return (
            <Link
              key={event.id}
              href={eventHref(event, tenantCode, fallbackHref)}
              className="block overflow-hidden rounded-2xl shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: cardBg || '#ffffff' }}
            >
              <div className="relative aspect-[3/4] bg-gray-100">
                {image ? (
                  <img src={image} alt={event.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold" style={{ background: `linear-gradient(135deg, ${visible.accent}, #111827)`, color: visible.text }}>
                    {new Date(event.heldAt).getDate()}
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm ${full ? 'bg-white/90 text-gray-400' : ''}`}
                  style={full ? undefined : { backgroundColor: visible.accent, color: visible.text }}
                >
                  {status}
                </span>
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: eventTitleColor || '#111827' }}>{event.title}</p>
                <p className="text-xs font-medium" style={{ color: eventDateColor || '#4B5563' }}>{eventDate(event)} {eventTime(event)}</p>
                {event.location && <p className="truncate text-xs" style={{ color: eventMetaColor || '#9CA3AF' }}>{event.location}</p>}
                <p className="text-xs" style={{ color: eventMetaColor || '#6B7280' }}>
                  {event.capacity ? `${event.reservedCount ?? 0}/${event.capacity}人` : `${event.reservedCount ?? 0}人予約`}
                  {price && ` / ${price}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="aspect-[3/4]" style={{ background: `linear-gradient(135deg, ${visible.accent}, #111827)` }} />
          <div className="space-y-1.5 p-3">
            <div className="h-2 w-5/6 rounded-full bg-gray-200" />
            <div className="h-1.5 w-2/3 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadMini({
  accentColor,
  events,
  tenantCode,
  fallbackHref,
  eventTitleColor,
  eventDateColor,
  eventMetaColor,
  cardBg,
}: {
  accentColor: string;
  events?: ReservationShowcaseEvent[];
  tenantCode?: string;
  fallbackHref?: string;
  eventTitleColor?: string;
  eventDateColor?: string;
  eventMetaColor?: string;
  cardBg?: string;
}) {
  const visible = readableAccent(accentColor);
  if (events) {
    if (events.length === 0) return <EmptyEvents accentColor={accentColor} />;
    const groups = events.reduce<Record<string, ReservationShowcaseEvent[]>>((acc, event) => {
      const key = monthLabel(event.heldAt);
      (acc[key] ??= []).push(event);
      return acc;
    }, {});

    return (
      <div className="space-y-5">
        {Object.entries(groups).map(([month, monthEvents]) => (
          <section key={month}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="h-4 w-1 rounded-full" style={{ backgroundColor: visible.accent }} />
              <p className="text-sm font-bold text-gray-800">{month}のスケジュール</p>
            </div>
            <div className="space-y-2">
              {monthEvents.map((event) => {
                const status = eventStatus(event);
                const full = status === '満席';
                const price = eventPrice(event);
                return (
                  <Link
                    key={event.id}
                    href={eventHref(event, tenantCode, fallbackHref)}
                    className="block rounded-xl border border-gray-200 px-4 py-3 shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: cardBg || '#ffffff' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold" style={{ color: eventTitleColor || '#111827' }}>{event.title}</p>
                        <p className="mt-1 text-xs" style={{ color: eventDateColor || '#6B7280' }}>{eventDate(event)}</p>
                        {event.location && <p className="truncate text-xs" style={{ color: eventMetaColor || '#9CA3AF' }}>{event.location}</p>}
                        <p className="text-xs" style={{ color: eventMetaColor || '#6B7280' }}>
                          {event.capacity ? `${event.reservedCount ?? 0}/${event.capacity}人` : `${event.reservedCount ?? 0}人予約`}
                          {price && ` / ${price}`}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${full ? 'bg-gray-100 text-gray-400' : ''}`} style={full ? undefined : { backgroundColor: visible.accent, color: visible.text }}>
                        {status}
                      </span>
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

  return (
    <div className="space-y-1.5">
      {[17, 24, 31].map((day, index) => (
        <div key={day} className="rounded-lg border border-gray-100 bg-white px-2 py-1.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-gray-800">7/{day}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
              style={{ backgroundColor: index === 2 ? '#9CA3AF' : visible.accent }}
            >
              {index === 2 ? '満席' : '募集中'}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-3/4 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export function ReservationViewShowcase({
  accentColor,
  buttonLabel,
  href,
  className = '',
  viewStyle = 'calendar',
  events,
  tenantCode,
  eventTitleColor,
  eventDateColor,
  eventMetaColor,
  eventCardBg,
}: ReservationViewShowcaseProps) {
  const visible = readableAccent(accentColor);
  const buttonClassName =
    'inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold transition hover:opacity-80';
  const buttonStyle = { backgroundColor: visible.accent, borderColor: visible.border, color: visible.text };
  const selectedView = viewStyle === 'card' || viewStyle === 'thread' ? viewStyle : 'calendar';

  return (
    <div className={`space-y-3 ${className}`}>
      {selectedView === 'calendar' ? (
        <CalendarPreview accentColor={accentColor} events={events} tenantCode={tenantCode} fallbackHref={href} eventTitleColor={eventTitleColor} eventDateColor={eventDateColor} cardBg={eventCardBg} />
      ) : (
        <div className="rounded-xl">
          {selectedView === 'card' && <CardMini accentColor={accentColor} events={events} tenantCode={tenantCode} fallbackHref={href} eventTitleColor={eventTitleColor} eventDateColor={eventDateColor} eventMetaColor={eventMetaColor} cardBg={eventCardBg} />}
          {selectedView === 'thread' && <ThreadMini accentColor={accentColor} events={events} tenantCode={tenantCode} fallbackHref={href} eventTitleColor={eventTitleColor} eventDateColor={eventDateColor} eventMetaColor={eventMetaColor} cardBg={eventCardBg} />}
        </div>
      )}
      {selectedView !== 'card' && (href ? (
        <Link href={href} className={buttonClassName} style={buttonStyle}>
          {buttonLabel}
        </Link>
      ) : (
        <button type="button" className={buttonClassName} style={buttonStyle}>
          {buttonLabel}
        </button>
      ))}
    </div>
  );
}
