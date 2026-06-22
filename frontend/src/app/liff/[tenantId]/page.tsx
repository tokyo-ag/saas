'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, API_URL, formatDateShort, LiffEvent, LiffTenant, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { useCalendarMonth } from '@/lib/useCalendarMonth';
import { initLiff, getLiffProfile } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';
import { EventCardSkeleton } from '@/components/liff/EventCardSkeleton';

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
        <span className="text-[10px] text-[#06C755] font-medium">友達{friendCount}人</span>
      )}
    </div>
  );
}

function EventCard({ event, tenantId }: { event: LiffEvent; tenantId: string }) {
  const img = imgUrl(event.imageUrl, API_URL);
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <Link
      href={`/liff/${tenantId}/events/${event.id}`}
      className="block rounded-xl overflow-hidden bg-white/85 active:opacity-70"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        {img ? (
          <img src={img} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#06C755] to-[#05a847]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-white font-bold text-[13px] leading-snug" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
            {event.title}
          </p>
        </div>
        {remaining !== null && remaining <= 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">満席</div>
        )}
        {remaining !== null && remaining > 0 && remaining <= 5 && (
          <div className="absolute top-2 right-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">残り{remaining}席</div>
        )}
      </div>

      {/* info */}
      <div className="px-2.5 pt-2 pb-2.5 space-y-1">
        <p className="text-[11px] text-gray-700 leading-snug line-clamp-2 font-medium">{event.title}</p>
        <p className="text-[10px] text-gray-400">{formatDateShort(event.heldAt)}</p>
        <AvatarRow count={event.reservedCount} friends={event.friendAttendees} />
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{event.location}</span>
          {event.priceMale != null && event.priceFemale != null ? (
            <>
              <span className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">男¥{event.priceMale.toLocaleString()}</span>
              <span className="text-[9px] text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-full">女¥{event.priceFemale.toLocaleString()}</span>
            </>
          ) : event.price === 0 ? (
            <span className="text-[9px] text-[#06C755] bg-green-50 px-1.5 py-0.5 rounded-full font-medium">無料</span>
          ) : (
            <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">¥{event.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function TenantCard({ tenant }: { tenant: PublicTenant }) {
  const name = tenant.lineDisplayName ?? tenant.name;
  return (
    <Link
      href={`/liff/${tenant.id}`}
      className="flex items-center gap-3 bg-white/85 rounded-xl px-3 py-3 active:opacity-70"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
    >
      {tenant.linePictureUrl ? (
        <img src={tenant.linePictureUrl} alt={name} className="w-10 h-10 rounded-full shrink-0 object-cover" />
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

function LiffCalendarView({ events, tenantId }: { events: LiffEvent[]; tenantId: string }) {
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
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #06C755 0%, #047a35 100%)' }}>
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
      <div className="grid grid-cols-7 bg-white">
        {cells.map((day, i) => {
          const col = i % 7;
          const dayEvents = day ? (eventsByDate[day.toString()] ?? []) : [];
          const todayCell = day ? isToday(day) : false;

          return (
            <div
              key={i}
              className={`border-b border-r border-gray-100 p-1 align-top min-h-[80px] ${
                !day ? 'bg-gray-50/60' : todayCell ? 'bg-[#06C755]/5' : ''
              }`}
            >
              {day && (
                <>
                  <span className={`flex w-6 h-6 items-center justify-center rounded-full text-[11px] font-semibold mx-auto mb-1 ${
                    todayCell
                      ? 'bg-[#06C755] text-white shadow-sm'
                      : col === 0 ? 'text-red-400'
                      : col === 6 ? 'text-blue-400'
                      : 'text-gray-600'
                  }`}>
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => {
                      const startTime = new Date(ev.heldAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
                      return (
                        <Link
                          key={ev.id}
                          href={`/liff/${tenantId}/events/${ev.id}`}
                          className="block rounded-md bg-[#06C755] px-1 py-0.5 active:opacity-70"
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

export default function LiffTopPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [events, setEvents] = useState<LiffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherTenants, setOtherTenants] = useState<PublicTenant[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [visitedOthers, setVisitedOthers] = useState<{ tenantId: string; tenantCode: string; name: string; iconUrl: string | null }[]>([]);

  useEffect(() => {
    async function init() {
      const tenantCacheKey = `liff_tenant_${tenantId}`;
      const eventsCacheKey = `liff_events_${tenantId}`;

      api.liff.recordAccess(tenantId).catch(() => {});
      const t = await api.liff.tenant(tenantId).catch(() => null);
      if (t) {
        setTenant(t);
        localStorage.setItem(tenantCacheKey, JSON.stringify(t));
        // 閲覧履歴を保存（最大5件）
        const entry = {
          tenantId: t.id,
          tenantCode: tenantId,
          name: t.lineDisplayName ?? t.name,
          iconUrl: t.linePictureUrl ?? t.iconUrl ?? null,
          visitedAt: Date.now(),
        };
        const prev = JSON.parse(localStorage.getItem('comiu_visited') ?? '[]') as typeof entry[];
        const updated = [entry, ...prev.filter((v) => v.tenantId !== t.id)].slice(0, 5);
        localStorage.setItem('comiu_visited', JSON.stringify(updated));
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

      // 他の団体を取得
      const allTenants = await api.public.tenants().catch(() => []);
      setOtherTenants(allTenants.filter((t) => t.id !== tenantId));

      const ok = await initLiff(t?.liffId);
      const lineProfile = ok ? await getLiffProfile().catch(() => null) : null;
      const uid = lineProfile?.userId ?? `demo-${tenantId}`;
      if (uid) {
        const eventsWithFriends = await api.liff.events(tenantId, uid).catch(() => null);
        if (eventsWithFriends) setEvents(eventsWithFriends);
      }
      if (lineProfile?.userId) {
        api.liff.syncLineProfile(tenantId, lineProfile.userId, {
          lineDisplayName: lineProfile.displayName,
          linePictureUrl: lineProfile.pictureUrl,
        }).catch(() => {});
      }
    }
    init();

    // 他の団体の閲覧履歴を読み込む
    try {
      const raw = localStorage.getItem('comiu_visited');
      if (raw) {
        const all = JSON.parse(raw) as { tenantId: string; tenantCode: string; name: string; iconUrl: string | null }[];
        setVisitedOthers(all.filter((v) => v.tenantCode !== tenantId && v.tenantId !== tenantId));
      }
    } catch { /* ignore */ }
  }, [tenantId]);

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] animate-page-in pb-24">
        {/* header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2.5 px-4 pt-12 pb-3 sm:pt-4 max-w-4xl mx-auto">
            {(tenant?.linePictureUrl ?? tenant?.iconUrl) ? (
              <img src={(tenant?.linePictureUrl ?? tenant?.iconUrl)!} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#06C755]/20 flex items-center justify-center shrink-0 text-sm">🎉</div>
            )}
            <h1 className="text-[18px] font-bold text-gray-900 tracking-tight truncate">
              {tenant?.lineDisplayName ?? tenant?.name ?? 'Home'}
            </h1>
          </div>
        </div>

        {isOffline && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center">
            現在サーバーに接続できません。以前に読み込んだ情報を表示しています。
          </div>
        )}

        <div className="p-2 max-w-4xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : tenant?.liffEventView === 'calendar' ? (
            <LiffCalendarView events={events} tenantId={tenantId} />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#06C755]/8 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-sm mb-1">現在募集中のイベントはありません</p>
              <p className="text-gray-400 text-xs">新しいイベントをお待ちください</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {events.map((ev) => <EventCard key={ev.id} event={ev} tenantId={tenantId} />)}
            </div>
          )}
          {/* 最近見た団体 */}
          {visitedOthers.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-1 mb-3">
                <span className="w-1 h-4 rounded-full bg-[#06C755] shrink-0" />
                <p className="text-[13px] font-bold text-gray-800">最近見た団体</p>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
                {visitedOthers.map((v) => (
                  <Link
                    key={v.tenantId}
                    href={`/liff/${v.tenantCode}`}
                    className="flex-none flex flex-col items-center gap-1.5 active:opacity-70 transition-opacity"
                    style={{ width: 60 }}
                  >
                    {v.iconUrl ? (
                      <img src={v.iconUrl} alt={v.name} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#06C755]/15 flex items-center justify-center text-lg font-bold text-[#06C755]">
                        {v.name[0]}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-600 font-medium text-center leading-tight line-clamp-2">{v.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* COMIU注目の団体！ */}
          {otherTenants.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-1 mb-3">
                <span className="w-1 h-4 rounded-full bg-[#06C755] shrink-0" />
                <p className="text-[13px] font-bold text-gray-800">COMIU注目の団体！</p>
              </div>
              <div className="flex flex-col gap-2">
                {otherTenants.map((t) => <TenantCard key={t.id} tenant={t} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
