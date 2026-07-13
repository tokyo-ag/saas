'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, API_URL, formatDateShort, LiffEvent, LiffTenant, PublicCmsPage } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import { useCalendarMonth } from '@/lib/useCalendarMonth';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function threadMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', timeZone: 'Asia/Tokyo' });
}
function threadPriceLabel(event: LiffEvent) {
  if (event.priceMale != null && event.priceFemale != null)
    return `男性 ${event.priceMale.toLocaleString()}円 / 女性 ${event.priceFemale.toLocaleString()}円`;
  return event.price === 0 ? '無料' : `${event.price.toLocaleString()}円`;
}
function statusLabel(event: LiffEvent) {
  if (!event.capacity) return '募集中';
  const rem = event.capacity - event.reservedCount;
  if (rem <= 0) return '満席';
  if (rem <= 5) return `残り${rem}席`;
  return '募集中';
}

function AvatarRow({ count }: { count: number }) {
  const shown = Math.min(count, 4);
  if (shown === 0) return null;
  const colors = ['bg-green-200', 'bg-blue-200', 'bg-yellow-200', 'bg-pink-200'];
  return (
    <div className="flex -space-x-1 shrink-0">
      {Array.from({ length: shown }).map((_, i) => (
        <div key={i} className={`w-4 h-4 rounded-full border border-white ${colors[i % colors.length]}`} />
      ))}
      {count > 4 && (
        <div className="w-4 h-4 rounded-full border border-white bg-gray-200 flex items-center justify-center">
          <span className="text-[7px] text-gray-500 font-bold">+{count - 4}</span>
        </div>
      )}
    </div>
  );
}

function CalendarView({ events, tenantCode, accentColor }: { events: LiffEvent[]; tenantCode: string; accentColor: string }) {
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth();
  const byDate: Record<string, LiffEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.heldAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const k = d.getDate().toString();
      (byDate[k] ??= []).push(ev);
    }
  }
  return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: accentColor }}>
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20"><span className="text-white text-sm">‹</span></button>
        <span className="text-sm font-bold text-white">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20"><span className="text-white text-sm">›</span></button>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-2 text-center text-[11px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 bg-white">
        {cells.map((day, i) => {
          const col = i % 7;
          const dayEvents = day ? (byDate[day.toString()] ?? []) : [];
          const today = day ? isToday(day) : false;
          return (
            <div key={i} className={`border-b border-r border-gray-100 p-1 min-h-[72px] ${!day ? 'bg-gray-50/60' : ''}`} style={today ? { backgroundColor: `${accentColor}0d` } : undefined}>
              {day && (
                <>
                  <span
                    className={`flex w-6 h-6 items-center justify-center rounded-full text-[11px] font-semibold mx-auto mb-1 ${today ? 'text-white' : col === 0 ? 'text-red-400' : col === 6 ? 'text-blue-400' : 'text-gray-600'}`}
                    style={today ? { backgroundColor: accentColor } : undefined}
                  >
                    {day}
                  </span>
                  {dayEvents.map((ev) => {
                    const t = new Date(ev.heldAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
                    return (
                      <Link key={ev.id} href={`/e/${tenantCode}/${ev.id}`} className="block rounded-sm px-1 py-0.5 mb-0.5" style={{ backgroundColor: accentColor }}>
                        <p className="text-[8px] font-bold text-white truncate">{ev.title}</p>
                        <p className="text-[8px] text-white/80">{t}</p>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThreadView({ events, tenantCode, accentColor }: { events: LiffEvent[]; tenantCode: string; accentColor: string }) {
  const groups = events.reduce<Record<string, LiffEvent[]>>((acc, ev) => {
    const key = threadMonthLabel(ev.heldAt);
    (acc[key] ??= []).push(ev);
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([month, evs]) => (
        <section key={month}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
            <h2 className="text-[15px] font-bold text-gray-800">{month}のスケジュール</h2>
          </div>
          <div className="space-y-2">
            {evs.map((ev) => {
              const st = statusLabel(ev);
              const full = st === '満席';
              return (
                <Link key={ev.id} href={`/e/${tenantCode}/${ev.id}`}
                  className="block rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm active:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-gray-900">{ev.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDateShort(ev.heldAt)}</p>
                      <p className="text-xs text-gray-400 truncate">{ev.location}</p>
                      <p className="text-xs text-gray-500">{ev.capacity ? `${ev.reservedCount}/${ev.capacity}人` : `${ev.reservedCount}人予約`} / {threadPriceLabel(ev)}</p>
                      <div className="mt-1"><AvatarRow count={ev.reservedCount} /></div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${full ? 'bg-gray-100 text-gray-400' : 'text-white'}`}
                      style={full ? undefined : { backgroundColor: accentColor }}
                    >
                      {st}
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

function CardView({ events, tenantCode }: { events: LiffEvent[]; tenantCode: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {events.map((ev) => {
        const img = imgUrl(ev.imageUrl, API_URL);
        const rem = ev.capacity != null ? ev.capacity - ev.reservedCount : null;
        return (
          <Link key={ev.id} href={`/e/${tenantCode}/${ev.id}`}
            className="block rounded-xl overflow-hidden bg-white shadow-sm active:opacity-70">
            <div className="relative aspect-[4/5]">
              {img ? (
                <Image src={img} alt={ev.title} fill className="object-cover" unoptimized />
              ) : (
                <Image src={DEFAULT_EVENT_IMAGE} alt={ev.title} fill className="object-cover" unoptimized />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-2 left-2 right-2 text-white text-[12px] font-bold leading-snug">{ev.title}</p>
              {rem !== null && rem <= 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">満席</span>}
              {rem !== null && rem > 0 && rem <= 5 && <span className="absolute top-2 right-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">残り{rem}席</span>}
            </div>
            <div className="px-2.5 py-2 space-y-1">
              <p className="text-[10px] text-gray-400">{formatDateShort(ev.heldAt)}</p>
              <p className="text-[9px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 inline-block">{ev.location}</p>
              <p className="text-[10px] font-semibold text-gray-600">{threadPriceLabel(ev)}</p>
              <AvatarRow count={ev.reservedCount} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function fetchPublicPage(tenantCode: string): Promise<PublicCmsPage | null> {
  try {
    const publicTenant = await api.public.tenant(tenantCode);
    const slug = publicTenant.pages?.[0]?.slug;
    if (!slug) return null;
    return await api.public.tenantPage(tenantCode, slug);
  } catch {
    return null;
  }
}

export default function ReservePage() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [page, setPage] = useState<PublicCmsPage | null>(null);
  const [events, setEvents] = useState<LiffEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.liff.tenant(tenantCode),
      api.liff.events(tenantCode),
      fetchPublicPage(tenantCode),
    ]).then(([t, evs, p]) => {
      setTenant(t);
      setEvents(evs);
      setPage(p);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tenantCode]);

  const tenantName = tenant?.lineDisplayName ?? tenant?.name ?? '';
  const icon = tenant?.linePictureUrl ?? tenant?.iconUrl;
  const view = tenant?.liffEventView ?? 'thread';
  const backgroundColor = page?.backgroundColor || '#F5F5F5';
  const accentColor = page?.accentColor || '#06C755';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto min-h-screen w-full max-w-md md:shadow-xl" style={{ backgroundColor }}>
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2.5">
          <Link href={`/clubs/${tenantCode}`} className="text-gray-400 text-lg mr-1">‹</Link>
          {icon && <Image src={icon} alt={tenantName} width={28} height={28} className="w-7 h-7 rounded-full object-cover" unoptimized />}
          <h1 className="text-[17px] font-bold text-gray-900 flex-1 truncate">{tenantName} — 予約</h1>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: accentColor }} /></div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-500 font-semibold text-sm">現在募集中のイベントはありません</p>
              <p className="text-gray-400 text-xs mt-1">新しいイベントをお待ちください</p>
            </div>
          ) : view === 'calendar' ? (
            <CalendarView events={events} tenantCode={tenantCode} accentColor={accentColor} />
          ) : view === 'card' ? (
            <CardView events={events} tenantCode={tenantCode} />
          ) : (
            <ThreadView events={events} tenantCode={tenantCode} accentColor={accentColor} />
          )}
        </div>
      </div>
    </div>
  );
}
