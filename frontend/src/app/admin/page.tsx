'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate } from '@/lib/api';
import type { Event } from '@/lib/api';
import { EventStatusBadge } from '@/components/ui/StatusBadge';

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.events.list().then(setEvents).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.heldAt) > now && e.status !== 'closed')
    .slice(0, 5);

  const thisMonthCount = events.filter((e) => {
    const d = new Date(e.heldAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <Link
          href="/admin/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          ＋ イベントを作成
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">今月のイベント数</p>
          <p className="text-3xl font-bold text-gray-900">{thisMonthCount}<span className="text-sm font-normal text-gray-500 ml-1">件</span></p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">直近のイベント</p>
          <p className="text-3xl font-bold text-gray-900">{upcoming.length}<span className="text-sm font-normal text-gray-500 ml-1">件</span></p>
        </div>
      </div>

      {/* 直近イベント一覧 */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">直近のイベント</h2>
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : upcoming.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-dashed border-gray-300 text-center">
          <p className="text-gray-500 mb-4">まだイベントがありません。最初のイベントを作成しましょう。</p>
          <Link href="/admin/events/new" className="text-blue-600 hover:underline text-sm">
            イベントを作成する →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((event) => (
            <div key={event.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <EventStatusBadge status={event.status} />
                  <span className="font-medium text-gray-900">{event.title}</span>
                </div>
                <p className="text-sm text-gray-500">{formatDate(event.heldAt)} · {event.location}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {event.reservedCount ?? 0}{event.capacity ? ` / ${event.capacity}` : ''}人
                </span>
                <Link href={`/admin/events/${event.id}`} className="text-blue-600 text-sm hover:underline">
                  詳細 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
