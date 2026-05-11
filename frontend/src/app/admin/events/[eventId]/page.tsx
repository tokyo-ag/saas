'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, formatDate, Event, Reservation } from '@/lib/api';
import { EventBadge, ReservationBadge } from '@/components/ui/Badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);

  async function load() {
    const [e, r] = await Promise.all([
      apiFetch<Event>(`/admin/events/${eventId}`),
      apiFetch<Reservation[]>(`/admin/events/${eventId}/reservations`),
    ]);
    setEvent(e);
    setReservations(r);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [eventId]);

  async function updateStatus(reservationId: string, status: string) {
    await apiFetch(`/admin/reservations/${reservationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const updated = await apiFetch<Reservation[]>(`/admin/events/${eventId}/reservations`);
    setReservations(updated);
  }

  async function sendRemind() {
    if (!confirm('リマインドメッセージを送信しますか？')) return;
    setReminding(true);
    try {
      const result = await apiFetch<{ sentCount: number }>(`/admin/events/${eventId}/remind`, { method: 'POST' });
      alert(`${result.sentCount}人に送信しました`);
    } finally {
      setReminding(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!event) return <div className="text-center py-12 text-red-500">イベントが見つかりません</div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
            <EventBadge status={event.status} />
          </div>
          <p className="text-gray-500 text-sm">{formatDate(event.heldAt)} · {event.location}</p>
          <p className="text-gray-600 text-sm mt-1">
            予約: {event.reservedCount}{event.capacity ? ` / ${event.capacity}` : ''} 人
            {(event.waitlistedCount ?? 0) > 0 && ` · キャンセル待ち ${event.waitlistedCount} 人`}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`${API_URL}/api/admin/events/${eventId}/export`}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            CSVダウンロード
          </a>
          <button
            onClick={sendRemind} disabled={reminding}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {reminding ? '送信中...' : 'リマインド送信'}
          </button>
          <Link
            href={`/admin/events/${eventId}/edit`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
          >
            編集
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">予約一覧（{reservations.length} 件）</h3>
        </div>
        {reservations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">まだ予約がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">名前</th>
                  <th className="px-6 py-3 text-left">学年</th>
                  <th className="px-6 py-3 text-left">性別</th>
                  <th className="px-6 py-3 text-left">予約日時</th>
                  <th className="px-6 py-3 text-left">ステータス</th>
                  <th className="px-6 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link href={`/admin/members/${r.member.id}`} className="hover:underline text-indigo-600">
                        {r.member.name ?? '未入力'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.member.grade ?? '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{r.member.gender ?? '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(r.reservedAt)}</td>
                    <td className="px-6 py-4">
                      <ReservationBadge status={r.status} />
                      {r.waitlistOrder && <span className="ml-1 text-xs text-gray-500">({r.waitlistOrder}番)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {r.status === 'reserved' && (
                          <button onClick={() => updateStatus(r.id, 'attended')} className="text-green-600 text-xs hover:underline">参加済にする</button>
                        )}
                        {['reserved', 'waitlisted', 'attended'].includes(r.status) && (
                          <button onClick={() => updateStatus(r.id, 'cancelled')} className="text-red-600 text-xs hover:underline">キャンセル</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
