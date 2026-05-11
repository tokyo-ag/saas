'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, formatDate, LiffEvent } from '@/lib/api';

export default function LiffEventDetailPage() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<LiffEvent>(`/liff/${tenantId}/events/${eventId}`)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId, eventId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-red-500">イベントが見つかりません</div>;

  const isFull = event.capacity != null && event.reservedCount >= event.capacity;
  const isClosed = event.status === 'closed';
  const remaining = event.capacity ? event.capacity - event.reservedCount : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 hover:text-white">←</button>
        <h1 className="text-lg font-bold flex-1 truncate">{event.title}</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">開催日時</p>
            <p className="font-medium text-gray-900">{formatDate(event.heldAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">開催場所</p>
            <p className="font-medium text-gray-900">{event.location}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">参加料</p>
            <p className="font-medium text-gray-900">{event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">定員・残席</p>
            <p className="font-medium text-gray-900">
              {event.capacity ? `${event.capacity}人 / 残り${Math.max(0, remaining ?? 0)}席` : '定員なし'}
            </p>
          </div>
          {event.description && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">詳細</p>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          {isClosed ? (
            <button disabled className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-medium">受付終了</button>
          ) : isFull && event.paymentRequired ? (
            <button disabled className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-medium">満席</button>
          ) : isFull ? (
            <button
              onClick={() => router.push(`/liff/${tenantId}/events/${eventId}/reserve?waitlist=1`)}
              className="w-full bg-yellow-500 text-white py-3 rounded-xl font-medium active:bg-yellow-600"
            >
              キャンセル待ちに登録する
            </button>
          ) : (
            <button
              onClick={() => router.push(`/liff/${tenantId}/events/${eventId}/reserve`)}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium active:bg-indigo-700"
            >
              予約する
            </button>
          )}
        </div>
        <div className="h-16" />
      </div>
    </div>
  );
}
