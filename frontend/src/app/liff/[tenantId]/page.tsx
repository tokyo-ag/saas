'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDateShort, LiffEvent, LiffTenant, PublicEvent } from '@/lib/api';
import { initLiff, getLiffUserId } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';
import { EventCardSkeleton } from '@/components/liff/EventCardSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const FAV_KEY = 'fav_tenants';

function loadFavs(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')); } catch { return new Set(); }
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
        <span className="text-[10px] text-[#06C755] font-medium">友達{friendCount}人</span>
      )}
    </div>
  );
}

function EventCard({ event, tenantId }: { event: LiffEvent; tenantId: string }) {
  const img = event.imageUrl ? `${API_URL}${event.imageUrl}` : null;
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <Link
      href={`/liff/${tenantId}/events/${event.id}`}
      className="block rounded-xl overflow-hidden bg-white active:opacity-70"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      {/* square image with title overlay */}
      <div className="relative" style={{ aspectRatio: '1/1' }}>
        {img ? (
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#06C755] to-[#047a35]" />
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
          {event.price === 0
            ? <span className="text-[9px] text-[#06C755] bg-green-50 px-1.5 py-0.5 rounded-full font-medium">無料</span>
            : <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">¥{event.price.toLocaleString()}</span>
          }
        </div>
      </div>
    </Link>
  );
}

function FavEventRow({ event }: { event: PublicEvent }) {
  const img = event.imageUrl ? `${API_URL}${event.imageUrl}` : null;
  const org = event.tenant.lineDisplayName ?? event.tenant.name;
  return (
    <Link
      href={`/liff/${event.tenantId}/events/${event.id}`}
      className="flex items-center gap-3 bg-white rounded-xl px-3 py-3 active:opacity-70"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#06C755] to-[#047a35]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 line-clamp-1">{event.title}</p>
        <p className="text-[10px] text-[#06C755] font-medium mt-0.5">{org}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatDateShort(event.heldAt)}</p>
        <p className="text-[10px] text-gray-400 truncate">{event.location}</p>
      </div>
      {event.price === 0
        ? <span className="text-[9px] text-[#06C755] bg-green-50 px-1.5 py-0.5 rounded-full font-medium shrink-0">無料</span>
        : <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">¥{event.price.toLocaleString()}</span>
      }
    </Link>
  );
}

export default function LiffTopPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [events, setEvents] = useState<LiffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [favEvents, setFavEvents] = useState<PublicEvent[]>([]);

  useEffect(() => {
    async function init() {
      const t = await api.liff.tenant(tenantId).catch(() => null);
      setTenant(t);

      const eventsNoFriend = await api.liff.events(tenantId).catch(() => []);
      setEvents(eventsNoFriend);
      setLoading(false);

      // お気に入り団体のイベントを取得
      const favs = loadFavs();
      if (favs.size > 0) {
        const allPublic = await api.public.events().catch(() => []);
        const filtered = allPublic
          .filter((e) => favs.has(e.tenantId) && e.tenantId !== tenantId)
          .sort((a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime());
        setFavEvents(filtered);
      }

      const ok = await initLiff();
      const uid = ok ? ((await getLiffUserId()) ?? '') : `demo-${tenantId}`;
      if (uid) {
        const eventsWithFriends = await api.liff.events(tenantId, uid).catch(() => null);
        if (eventsWithFriends) setEvents(eventsWithFriends);
      }
    }
    init();
  }, [tenantId]);

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] animate-page-in pb-24">
        {/* header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2.5 px-4 pt-12 pb-3 sm:pt-4 max-w-4xl mx-auto">
            {tenant?.linePictureUrl ? (
              <img src={tenant.linePictureUrl} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#06C755]/15 flex items-center justify-center shrink-0 text-sm">🎉</div>
            )}
            <h1 className="text-[18px] font-bold text-gray-900 tracking-tight truncate">
              {tenant?.lineDisplayName ?? tenant?.name ?? 'Home'}
            </h1>
          </div>
        </div>

        <div className="p-2 max-w-4xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#06C755]/8 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
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
          {/* お気に入り団体のイベント */}
          {favEvents.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-bold text-gray-700 px-1 mb-3">
                ⭐ お気に入り団体のイベント
              </p>
              <div className="space-y-2">
                {favEvents.map((ev) => <FavEventRow key={ev.id} event={ev} />)}
              </div>
            </div>
          )}

          <div className="pt-8 text-center">
            <Link href="/register" className="text-[11px] text-gray-300">主催者・団体の方はこちら</Link>
          </div>
        </div>
      </div>

      <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
