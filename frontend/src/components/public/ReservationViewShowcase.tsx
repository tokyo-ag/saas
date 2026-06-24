'use client';

import Link from 'next/link';
import { useCalendarMonth } from '@/lib/useCalendarMonth';

type ReservationViewShowcaseProps = {
  accentColor: string;
  buttonLabel: string;
  href?: string;
  className?: string;
  viewStyle?: string | null;
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

function CalendarPreview({ accentColor }: { accentColor: string }) {
  const visible = readableAccent(accentColor);
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth();

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

      <div className="grid grid-cols-7 bg-white">
        {cells.map((day, i) => {
          const col = i % 7;
          const today = day ? isToday(day) : false;
          const hasEvent = day ? DUMMY_EVENT_DAYS.has(day) : false;
          return (
            <div
              key={i}
              className={`border-b border-r border-gray-100 p-1 min-h-[56px] ${
                !day ? 'bg-gray-50/60' : today ? 'bg-green-50' : ''
              }`}
              style={today ? { backgroundColor: `${visible.accent}10` } : undefined}
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
                  {hasEvent && (
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

function CardMini({ accentColor }: { accentColor: string }) {
  const visible = readableAccent(accentColor);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="h-12" style={{ background: `linear-gradient(135deg, ${visible.accent}, #111827)` }} />
      <div className="space-y-1.5 p-2">
        <div className="h-2 w-5/6 rounded-full bg-gray-800" />
        <div className="h-1.5 w-2/3 rounded-full bg-gray-200" />
        <div className="flex gap-1">
          <span className="h-4 w-4 rounded-full bg-green-100" />
          <span className="h-4 w-4 rounded-full bg-blue-100" />
          <span className="h-4 w-4 rounded-full bg-pink-100" />
        </div>
      </div>
    </div>
  );
}

function ThreadMini({ accentColor }: { accentColor: string }) {
  const visible = readableAccent(accentColor);
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
}: ReservationViewShowcaseProps) {
  const visible = readableAccent(accentColor);
  const buttonClassName =
    'inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold transition hover:opacity-80';
  const buttonStyle = { backgroundColor: visible.accent, borderColor: visible.border, color: visible.text };
  const selectedView = viewStyle === 'card' || viewStyle === 'thread' ? viewStyle : 'calendar';

  return (
    <div className={`space-y-3 ${className}`}>
      {selectedView === 'calendar' ? (
        <CalendarPreview accentColor={accentColor} />
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          {selectedView === 'card' && <CardMini accentColor={accentColor} />}
          {selectedView === 'thread' && <ThreadMini accentColor={accentColor} />}
        </div>
      )}
      {href ? (
        <Link href={href} className={buttonClassName} style={buttonStyle}>
          {buttonLabel}
        </Link>
      ) : (
        <button type="button" className={buttonClassName} style={buttonStyle}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
