'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, formatDate, LiffEvent } from '@/lib/api';

export default function LiffTopPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [events, setEvents] = useState<LiffEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<LiffEvent[]>(`/liff/${tenantId}/events`)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  function seatLabel(event: LiffEvent) {
    if (!event.capacity) return null;
    const remaining = event.capacity - event.reservedCount;
    if (remaining <= 0) return '満席';
    if (remaining <= 5) return `残り${remaining}席`;
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-6">
        <h1 className="text-xl font-bold">イベント一覧</h1>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : events.length === 0 ? (
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
