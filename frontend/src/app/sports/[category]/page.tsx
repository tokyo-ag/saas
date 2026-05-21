'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, API_URL, PublicEvent } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';

const CATEGORY_META: Record<string, { label: string; emoji: string; desc: string }> = {
  badminton: { label: 'バドミントン', emoji: '🏸', desc: 'バドミントンサークル・交流イベント一覧' },
  futsal: { label: 'フットサル', emoji: '⚽', desc: 'フットサルサークル・交流イベント一覧' },
  basketball: { label: 'バスケットボール', emoji: '🏀', desc: 'バスケットボールサークル・交流イベント一覧' },
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  });
}

export default function SportsCategoryPage() {
  if (process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-8 text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">まもなくオープン</p>
          <p className="text-sm text-gray-400 mt-1">このページは準備中です</p>
        </div>
        <Link href="/" className="bg-[#06C755] text-white font-bold text-sm px-8 py-3 rounded-full">
          ホームへ戻る
        </Link>
      </div>
    );
  }
  const { category } = useParams<{ category: string }>();
  const meta = CATEGORY_META[category];

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.public.events(category)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">カテゴリが見つかりません</p>
          <Link href="/" className="mt-3 inline-block text-[#06C755] text-sm font-medium">トップへ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 sm:pt-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-gray-900">{meta.emoji} {meta.label}</h1>
            <p className="text-[11px] text-gray-400">{meta.desc}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">{meta.emoji}</p>
            <p className="text-gray-700 font-semibold text-sm">{meta.label}のイベントは現在ありません</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">主催者が増えるとここにイベントが表示されます</p>
            <Link href="/" className="mt-6 bg-[#06C755] text-white font-bold text-sm px-6 py-2.5 rounded-full">
              トップへ戻る
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const img = imgUrl(ev.imageUrl, API_URL);
              const org = ev.tenant.lineDisplayName ?? ev.tenant.name;
              const remaining = ev.capacity != null ? ev.capacity - ev.reservedCount : null;

              return (
                <Link key={ev.id} href={`/liff/${ev.tenantId}/events/${ev.id}`}
                  className="bg-white rounded-2xl overflow-hidden flex gap-3 p-3 block"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                >
                  <div className="relative w-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#06C755] to-[#047a35] aspect-[4/5]">
                    {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    {remaining !== null && remaining <= 0 && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">満席</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug">{ev.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{fmtDate(ev.heldAt)}</p>
                    <p className="text-[11px] text-gray-400 truncate">{ev.location}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{org}</span>
                      {ev.priceMale != null && ev.priceFemale != null
                        ? <span className="text-[11px] text-gray-600 font-medium">¥{Math.min(ev.priceMale, ev.priceFemale).toLocaleString()}〜</span>
                        : ev.price === 0
                        ? <span className="text-[11px] text-[#06C755] font-semibold">無料</span>
                        : <span className="text-[11px] text-gray-600 font-medium">¥{ev.price.toLocaleString()}</span>}
                    </div>
                    {ev.viewCount > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">閲覧数: {ev.viewCount.toLocaleString()}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
