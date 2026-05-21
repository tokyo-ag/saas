'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, API_URL, PublicEvent, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { initLiff } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <p className="text-[13px] font-bold text-gray-800 px-4 mb-3">
      <span className="mr-1.5">{emoji}</span>{title}
    </p>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  });
}

function EventCard({ event, showViews }: { event: PublicEvent; showViews?: boolean }) {
  const img = imgUrl(event.imageUrl, API_URL);
  const org = event.tenant.lineDisplayName ?? event.tenant.name;
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <Link
      href={`/liff/${event.tenantId}/events/${event.id}`}
      className="flex-shrink-0 w-44 rounded-xl overflow-hidden bg-white block"
      style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.09)' }}
    >
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        {img ? (
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#06C755] to-[#047a35]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {remaining !== null && remaining <= 0 && (
          <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">満席</div>
        )}
        <div className="absolute bottom-1.5 left-2 right-2">
          <p className="text-white font-bold text-[11px] leading-snug line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {event.title}
          </p>
        </div>
      </div>
      <div className="px-2.5 pt-2 pb-2.5 space-y-0.5">
        <p className="text-[10px] text-gray-400">{fmtDate(event.heldAt)}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{org}</span>
          {event.price === 0
            ? <span className="text-[9px] text-[#06C755] font-semibold">無料</span>
            : <span className="text-[9px] text-gray-500">¥{event.price.toLocaleString()}</span>}
        </div>
        {showViews && event.viewCount > 0 && (
          <p className="text-[10px] text-gray-400">👁 {event.viewCount.toLocaleString()}回閲覧</p>
        )}
      </div>
    </Link>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function RankingCard({ tenant, rank }: { tenant: PublicTenant; rank: number }) {
  const displayName = tenant.lineDisplayName ?? tenant.name;

  return (
    <Link
      href={`/liff/${tenant.id}`}
      className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 flex flex-col items-center gap-2 relative block"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <span className="absolute top-2 left-3 text-base leading-none">{MEDALS[rank] ?? `${rank + 1}位`}</span>
      {tenant.linePictureUrl ? (
        <img src={tenant.linePictureUrl} alt="" className="w-14 h-14 rounded-full object-cover mt-3 border-2 border-gray-100" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#06C755] to-[#047a35] mt-3 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{displayName[0]}</span>
        </div>
      )}
      <p className="text-[12px] font-semibold text-gray-800 text-center leading-snug line-clamp-2">{displayName}</p>
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <span>👁 {tenant.accessCount}</span>
        <span>👤 {tenant.memberCount}</span>
      </div>
    </Link>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide">
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-44 rounded-xl overflow-hidden bg-white animate-pulse" style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.09)' }}>
      <div className="bg-gray-200" style={{ aspectRatio: '4/3' }} />
      <div className="p-2.5 space-y-2">
        <div className="h-2 bg-gray-100 rounded w-3/4" />
        <div className="h-2 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function TopPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  // LINE認証後のリダイレクト
  useEffect(() => {
    async function run() {
      const pending = localStorage.getItem('liff-pending-redirect');
      const search = window.location.search;
      if (search.includes('code=') || search.includes('liff.state=') || pending) {
        await initLiff();
      }
      if (pending) {
        localStorage.removeItem('liff-pending-redirect');
        window.location.replace(pending);
      }
    }
    run();
  }, []);

  useEffect(() => {
    Promise.all([api.public.events(), api.public.tenants()])
      .then(([evs, tns]) => {
        setEvents(evs);
        setTenants(tns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function limitPerTenant(list: PublicEvent[], max = 2) {
    const counts: Record<string, number> = {};
    return list.filter((ev) => {
      counts[ev.tenantId] = (counts[ev.tenantId] ?? 0) + 1;
      return counts[ev.tenantId] <= max;
    });
  }

  // 注目イベント: テナントのアクセス数上位 (1団体最大2件)
  const hotEvents = limitPerTenant(
    [...events].sort((a, b) => b.tenantAccessCount - a.tenantAccessCount)
  ).slice(0, 10);

  // 日時順 (1団体最大2件)
  const byDate = limitPerTenant(
    [...events].sort((a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime())
  );

  // 検索
  const searchResults = query.trim()
    ? events.filter((ev) =>
        [ev.title, ev.location, ev.tenant.lineDisplayName ?? ev.tenant.name]
          .join(' ').toLowerCase().includes(query.toLowerCase())
      )
    : events;

  return (
    <>
      {/* 検索オーバーレイ */}
      {searchOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-gray-100">
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="イベント名・場所・主催者で検索"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none" />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            <button onClick={() => { setSearchOpen(false); setQuery(''); }} className="text-[#06C755] text-sm font-medium shrink-0">
              キャンセル
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {query && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-gray-500 text-sm font-medium">「{query}」に一致するイベントがありません</p>
                <p className="text-gray-400 text-xs mt-1">別のキーワードで試してみてください</p>
              </div>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {(query ? searchResults : events).map((ev) => <EventCard key={ev.id} event={ev} />)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F5F5F5] pb-28">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">COMIU</h1>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">東京でNO.1のコミュニティサイトを目指して</p>
          </div>
          <button onClick={() => setSearchOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        {/* カテゴリボタン */}
        <div className="pt-4 pb-1 px-4">
          <div className="flex gap-2">
            {[
              { key: 'badminton', label: 'バドミントン', emoji: '🏸' },
              { key: 'futsal', label: 'フットサル', emoji: '⚽' },
              { key: 'basketball', label: 'バスケ', emoji: '🏀' },
            ].map((cat) => (
              <Link
                key={cat.key}
                href={`/sports/${cat.key}`}
                className="flex items-center gap-1.5 bg-white rounded-full px-3 py-2 text-[12px] font-semibold text-gray-700 active:bg-gray-50 transition-colors"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* セクション1: 今月の注目イベント */}
        <div className="pt-5 pb-2">
          <SectionHeader emoji="🔥" title="今月の注目イベント" />
          {loading ? (
            <HScroll>{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</HScroll>
          ) : hotEvents.length === 0 ? (
            <p className="text-xs text-gray-400 px-4">今月のイベントはまだありません</p>
          ) : (
            <HScroll>
              {hotEvents.map((ev) => <EventCard key={ev.id} event={ev} showViews />)}
            </HScroll>
          )}
        </div>

        {/* セクション2: 日時順のイベント */}
        <div className="pt-4 pb-2">
          <SectionHeader emoji="📅" title="開催日時順" />
          {loading ? (
            <HScroll>{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</HScroll>
          ) : byDate.length === 0 ? (
            <p className="text-xs text-gray-400 px-4">開催予定のイベントはありません</p>
          ) : (
            <HScroll>
              {byDate.map((ev) => <EventCard key={ev.id} event={ev} />)}
            </HScroll>
          )}
        </div>

        {/* セクション3: 人気の団体 */}
        <div className="pt-4 pb-2">
          <SectionHeader emoji="🏆" title="人気の団体" />
          {loading ? (
            <HScroll>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36 h-48 bg-white rounded-2xl animate-pulse" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} />
              ))}
            </HScroll>
          ) : tenants.length === 0 ? (
            <p className="text-xs text-gray-400 px-4">団体がありません</p>
          ) : (
            <HScroll>
              {tenants.slice(0, 8).map((t, i) => (
                <RankingCard key={t.id} tenant={t} rank={i} />
              ))}
            </HScroll>
          )}
        </div>

        {/* 主催者登録CTA */}
        <div className="mx-4 mt-6 mb-2 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #06C755 0%, #047a35 100%)' }}>
          <div className="px-5 py-5">
            <p className="text-white font-bold text-[15px] leading-snug">あなたも交流会を<br />開催しませんか？</p>
            <p className="text-white/80 text-[12px] mt-1.5">フリープランは無料・月2イベントから</p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/register"
                className="bg-white text-[#06C755] font-bold text-sm px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                無料で始める →
              </Link>
              <Link href="/pricing" className="text-white/70 text-xs hover:text-white underline">
                料金を見る
              </Link>
              <Link href="/login" className="text-white/70 text-xs hover:text-white underline">
                ログイン
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-4 pb-4 text-center">
          <span className="text-[10px] text-gray-300">© COMIU</span>
        </div>
      </div>

      <LiffBottomNav />
    </>
  );
}
