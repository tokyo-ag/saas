'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, formatDate, LiffEvent, Tenant } from '@/lib/api';
import { initLiff, checkFriendship } from '@/lib/liff';

export default function LiffTopPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [events, setEvents] = useState<LiffEvent[]>([]);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // LIFF SDK 初期化（LIFF IDがなければスキップ）
      const ok = await initLiff();

      if (ok) {
        const friend = await checkFriendship();
        setIsFriend(friend);
        if (!friend) {
          setLoading(false);
          return;
        }
      } else {
        // 開発中：LIFF IDなしの場合はフレンドチェックをスキップ
        setIsFriend(true);
      }

      const [t, e] = await Promise.all([
        apiFetch<Tenant>('/admin/tenant').catch(() => null),
        apiFetch<LiffEvent[]>(`/liff/${tenantId}/events`).catch(() => []),
      ]);
      setTenant(t);
      setEvents(e);
      setLoading(false);
    }
    init();
  }, [tenantId]);

  function seatLabel(event: LiffEvent) {
    if (!event.capacity) return null;
    const remaining = event.capacity - event.reservedCount;
    if (remaining <= 0) return '満席';
    if (remaining <= 5) return `残り${remaining}席`;
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  // 友だち未追加
  if (isFriend === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white px-4 py-6">
          <h1 className="text-xl font-bold">{tenant?.name ?? '交流会'}</h1>
          {tenant?.description && <p className="text-indigo-200 text-sm mt-1">{tenant.description}</p>}
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-gray-600 mb-6 leading-relaxed">
            イベントを予約するには<br />LINE公式アカウントを友だち追加してください
          </p>
          <a
            href={`https://line.me/R/ti/p/${tenant?.lineChannelId ?? ''}`}
            className="bg-green-500 text-white px-8 py-3 rounded-xl font-medium text-lg"
          >
            友だち追加
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold">{tenant?.name ?? 'イベント一覧'}</h1>
        {tenant?.description && (
          <p className="text-indigo-200 text-sm mt-1">{tenant.description}</p>
        )}
      </div>

      <div className="px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">現在募集中のイベントはありません</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {events.map((event) => {
              const label = seatLabel(event);
              const isFull = event.capacity != null && event.reservedCount >= event.capacity;
              return (
                <Link
                  key={event.id}
                  href={`/liff/${tenantId}/events/${event.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 block active:bg-gray-50"
                >
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2">{event.title}</h3>
                  <p className="text-xs text-gray-500">{formatDate(event.heldAt)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{event.location}</p>
                  {event.price > 0 && (
                    <p className="text-xs text-indigo-600 mt-1 font-medium">¥{event.price.toLocaleString()}</p>
                  )}
                  {label && (
                    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${isFull ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
