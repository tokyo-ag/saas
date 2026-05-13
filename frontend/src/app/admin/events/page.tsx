'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate } from '@/lib/api';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import type { Event } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Tab = 'upcoming' | 'past' | 'draft';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');

  const load = () => {
    setLoading(true);
    api.events.list().then(setEvents).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const now = new Date();
  const filtered = events.filter((e) => {
    if (tab === 'upcoming') return new Date(e.heldAt) > now && e.status !== 'draft';
    if (tab === 'past') return new Date(e.heldAt) <= now || e.status === 'closed';
    return e.status === 'draft';
  });

  const handleDelete = async (id: string) => {
    if (!confirm('このイベントを削除しますか？')) return;
    try {
      await api.events.delete(id);
      load();
    } catch {
      alert('削除に失敗しました');
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
        <Link href="/admin/events/new" className="bg-[#06C755] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#05a847] transition-colors">
          ＋ 新規作成
        </Link>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-5">
        {([['upcoming', '予定'], ['past', '過去'], ['draft', '下書き']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-[#06C755] text-[#06C755]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">イベントがありません</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {event.iconUrl && (
                      <img src={`${API_URL}${event.iconUrl}`} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                    )}
                    <EventStatusBadge status={event.status} />
                    <span className="font-medium text-gray-900">{event.title}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(event.heldAt)} · {event.location}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    予約: {event.reservedCount ?? 0}{event.capacity ? ` / ${event.capacity}人` : '人'}
                    {(event.waitlistedCount ?? 0) > 0 && (
                      <span className="ml-2 text-yellow-600">（キャンセル待ち {event.waitlistedCount}人）</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Link href={`/admin/events/${event.id}`} className="text-sm text-[#06C755] hover:underline">詳細</Link>
                  <Link href={`/admin/events/${event.id}/edit`} className="text-sm text-gray-600 hover:underline">編集</Link>
                  <button onClick={() => handleDelete(event.id)} className="text-sm text-red-500 hover:underline">削除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
