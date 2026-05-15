'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, API_URL, PublicEvent, PublicTenant } from '@/lib/api';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

const FAV_KEY = 'fav_tenants';
const ANON_KEY = 'anon_id';

function getAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANON_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(ANON_KEY, id); }
  return id;
}
function loadFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')); } catch { return new Set(); }
}
function saveFavs(favs: Set<string>) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  });
}

function HeartIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? '#ef4444' : 'none'}
      stroke={filled ? '#ef4444' : 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <p className="text-[13px] font-bold text-gray-800 px-4 mb-3">
      <span className="mr-1.5">{emoji}</span>{title}
    </p>
  );
}

function EventCard({ event, liked, onToggleLike, favTenants, onToggleFav }: {
  event: PublicEvent;
  liked: boolean;
  onToggleLike: (id: string) => void;
  favTenants: Set<string>;
  onToggleFav: (tenantId: string) => void;
}) {
  const img = event.imageUrl ? `${API_URL}${event.imageUrl}` : null;
  const org = event.tenant.lineDisplayName ?? event.tenant.name;
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;

  return (
    <div className="flex-shrink-0 w-44 rounded-xl overflow-hidden bg-white" style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.09)' }}>
      <Link href={`/liff/${event.tenantId}/events/${event.id}`} className="block">
        <div className="relative" style={{ aspectRatio: '4/3' }}>
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
        <div className="px-2.5 pt-2 pb-1.5 space-y-0.5">
          <p className="text-[10px] text-gray-400">{fmtDate(event.heldAt)}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{org}</span>
            {event.price === 0
              ? <span className="text-[9px] text-[#06C755] font-semibold">無料</span>
              : <span className="text-[9px] text-gray-500">¥{event.price.toLocaleString()}</span>}
          </div>
        </div>
      </Link>
      {/* アクションバー */}
      <div className="px-2.5 pb-2 flex items-center justify-between">
        <button
          onClick={() => onToggleLike(event.id)}
          className="flex items-center gap-1 text-gray-400 active:scale-90 transition-transform"
        >
          <HeartIcon filled={liked} size={13} />
          <span className={`text-[11px] font-medium ${liked ? 'text-red-400' : 'text-gray-400'}`}>
            {event.likeCount + (liked && !event.userLiked ? 1 : !liked && event.userLiked ? -1 : 0)}
          </span>
        </button>
        <button
          onClick={() => onToggleFav(event.tenantId)}
          className="text-[9px] flex items-center gap-0.5 text-gray-300 active:scale-90 transition-transform"
          title="団体をお気に入り"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill={favTenants.has(event.tenantId) ? '#f59e0b' : 'none'} stroke={favTenants.has(event.tenantId) ? '#f59e0b' : '#D1D5DB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function RankingCard({ tenant, rank, favTenants, onToggleFav }: {
  tenant: PublicTenant;
  rank: number;
  favTenants: Set<string>;
  onToggleFav: (id: string) => void;
}) {
  const isFav = favTenants.has(tenant.id);
  const displayName = tenant.lineDisplayName ?? tenant.name;

  return (
    <div className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 flex flex-col items-center gap-2 relative"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <span className="absolute top-2 left-3 text-base leading-none">{MEDALS[rank] ?? `${rank + 1}位`}</span>
      <button
        onClick={() => onToggleFav(tenant.id)}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center active:scale-90 transition-transform"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={isFav ? '#f59e0b' : 'none'} stroke={isFav ? '#f59e0b' : '#D1D5DB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
      {tenant.linePictureUrl ? (
        <img src={tenant.linePictureUrl} alt="" className="w-14 h-14 rounded-full object-cover mt-3 border-2 border-gray-100" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#06C755] to-[#047a35] mt-3 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{displayName[0]}</span>
        </div>
      )}
      <p className="text-[12px] font-semibold text-gray-800 text-center leading-snug line-clamp-2">{displayName}</p>
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <span>❤️ {tenant.totalLikes}</span>
        <span>👤 {tenant.memberCount}</span>
      </div>
    </div>
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

function DiscoveryLocked() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4">
        <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">COMIU</h1>
        <p className="text-[11px] text-gray-500 mt-0.5">東京でNO.1のコミュニティサイトを目指して</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">まもなくオープン</p>
          <p className="text-sm text-gray-400 mt-1">現在サービス準備中です。<br />もうしばらくお待ちください。</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="bg-[#06C755] text-white font-bold text-sm px-8 py-3 rounded-full w-full"
        >
          ← 前のページに戻る
        </button>
        <div className="rounded-2xl overflow-hidden w-full" style={{ background: 'linear-gradient(135deg, #06C755 0%, #047a35 100%)' }}>
          <div className="px-5 py-5">
            <p className="text-white font-bold text-[15px]">主催者の方はこちら</p>
            <p className="text-white/80 text-[12px] mt-1">先行登録受付中</p>
            <div className="flex items-center gap-3 mt-4">
              <Link href="/register" className="bg-white text-[#06C755] font-bold text-sm px-5 py-2.5 rounded-full">
                無料で始める →
              </Link>
              <Link href="/login" className="text-white/70 text-xs underline">ログイン</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopPage() {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') return <DiscoveryLocked />;
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [favTenants, setFavTenants] = useState<Set<string>>(new Set());
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const TAGS = ['初心者歓迎', '20代限定', '30代限定', '男女歓迎', '社会人', '学生歓迎'];

  useEffect(() => {
    const anonId = getAnonId();
    setFavTenants(loadFavs());
    Promise.all([api.public.events(anonId), api.public.tenants()])
      .then(([evs, tns]) => {
        setEvents(evs);
        setLikedIds(new Set(evs.filter((e) => e.userLiked).map((e) => e.id)));
        setTenants(tns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleLike = useCallback(async (eventId: string) => {
    const anonId = getAnonId();
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
    await api.public.toggleLike(eventId, anonId).catch(() => {
      // 失敗時はロールバック
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.has(eventId) ? next.delete(eventId) : next.add(eventId);
        return next;
      });
    });
  }, []);

  const toggleFav = useCallback((tenantId: string) => {
    setFavTenants((prev) => {
      const next = new Set(prev);
      next.has(tenantId) ? next.delete(tenantId) : next.add(tenantId);
      saveFavs(next);
      return next;
    });
  }, []);

  const filteredEvents = activeTag ? events.filter((ev) => ev.tags?.includes(activeTag)) : events;

  // 今月の注目（月間いいね数上位）
  const hotEvents = [...filteredEvents].sort((a, b) => b.monthlyLikeCount - a.monthlyLikeCount).slice(0, 10);
  // 日時順
  const byDate = [...filteredEvents].sort((a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime());
  // 検索
  const searchResults = query.trim()
    ? events.filter((ev) =>
        [ev.title, ev.location, ev.tenant.lineDisplayName ?? ev.tenant.name]
          .join(' ').toLowerCase().includes(query.toLowerCase())
      )
    : events;

  const cardProps = (ev: PublicEvent) => ({
    event: ev,
    liked: likedIds.has(ev.id),
    onToggleLike: toggleLike,
    favTenants,
    onToggleFav: toggleFav,
  });

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
                {(query ? searchResults : events).map((ev) => <EventCard key={ev.id} {...cardProps(ev)} />)}
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

        {/* タグフィルター */}
        <div className="pt-2 pb-1">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                  activeTag === tag
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {tag}
              </button>
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
              {hotEvents.map((ev) => (
                <div key={ev.id} className="relative">
                  {ev.monthlyLikeCount > 0 && (
                    <div className="absolute -top-1.5 left-2 z-10 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      ❤️ {ev.monthlyLikeCount}
                    </div>
                  )}
                  <EventCard {...cardProps(ev)} />
                </div>
              ))}
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
              {byDate.map((ev) => <EventCard key={ev.id} {...cardProps(ev)} />)}
            </HScroll>
          )}
        </div>

        {/* セクション3: 人気の団体ランキング */}
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
                <RankingCard key={t.id} tenant={t} rank={i} favTenants={favTenants} onToggleFav={toggleFav} />
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
