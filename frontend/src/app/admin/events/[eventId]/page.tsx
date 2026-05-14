'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, downloadWithAuth, API_URL, Event, Reservation, AdminEventReview } from '@/lib/api';
import { EventBadge, ReservationBadge } from '@/components/ui/StatusBadge';


type EventReservation = Reservation & {
  member: {
    id: string;
    name?: string | null;
    grade?: string | null;
    gender?: string | null;
  };
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [reservations, setReservations] = useState<EventReservation[]>([]);
  const [reviews, setReviews] = useState<AdminEventReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [msgContent, setMsgContent] = useState('');
  const [msgSendLine, setMsgSendLine] = useState(true);
  const [msgSendApp, setMsgSendApp] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    const [eventData, reservationList, reviewList] = await Promise.all([
      api.events.get(eventId),
      api.events.reservations(eventId),
      api.events.reviews(eventId),
    ]);
    setEvent(eventData);
    setReservations(reservationList as EventReservation[]);
    setReviews(reviewList);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [eventId]);

  async function updateStatus(reservationId: string, status: string) {
    try {
      await api.reservations.updateStatus(reservationId, status);
      const updated = await api.events.reservations(eventId);
      setReservations(updated as EventReservation[]);
    } catch {
      alert('ステータスの更新に失敗しました');
    }
  }

  async function sendRemind() {
    if (!confirm('リマインドメッセージを送信しますか？')) return;
    setReminding(true);
    try {
      const result = await api.events.remind(eventId) as { sentCount: number };
      alert(`${result.sentCount}人に送信しました`);
    } catch {
      alert('送信に失敗しました');
    } finally {
      setReminding(false);
    }
  }

  async function handleSendMessage() {
    if (!msgContent.trim()) return;
    if (!msgSendLine && !msgSendApp) { alert('送信先を選択してください'); return; }
    setSending(true);
    try {
      const result = await api.events.sendMessage(eventId, { content: msgContent, sendLine: msgSendLine, sendApp: msgSendApp });
      alert(`送信完了：${result.total}人に送りました`);
      setShowMessage(false);
      setMsgContent('');
    } catch {
      alert('送信に失敗しました');
    } finally {
      setSending(false);
    }
  }

  async function toggleReview(reviewId: string, isPublished: boolean) {
    try {
      await api.events.updateReview(eventId, reviewId, isPublished);
      setReviews((prev) => prev.map((review) => (review.id === reviewId ? { ...review, isPublished } : review)));
    } catch {
      alert('感想の更新に失敗しました');
    }
  }

  if (loading) return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  if (!event) return <div className="px-4 py-12 text-center text-sm text-red-500">イベントが見つかりません</div>;

  return (
    <>
    {showMessage && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0" onClick={() => setShowMessage(false)}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-900">参加者へのメッセージ</h3>
            <p className="mt-0.5 text-xs text-gray-400">予約確定済みの {reservations.filter(r => ['reserved','attended','waiting_payment'].includes(r.status)).length} 人に送信されます</p>
          </div>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] resize-none"
            rows={4}
            placeholder="例：本日の集合場所が変更になりました。○○公園の正面入口にお集まりください。"
            value={msgContent}
            onChange={(e) => setMsgContent(e.target.value)}
          />
          <div className="mt-3 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={msgSendLine} onChange={(e) => setMsgSendLine(e.target.checked)} className="rounded accent-[#06C755]" />
              LINEで送る
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={msgSendApp} onChange={(e) => setMsgSendApp(e.target.checked)} className="rounded accent-[#06C755]" />
              アプリ内通知
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowMessage(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
              キャンセル
            </button>
            <button
              onClick={handleSendMessage}
              disabled={sending || !msgContent.trim()}
              className="flex-1 rounded-xl bg-[#06C755] py-2.5 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
            >
              {sending ? '送信中...' : '送信する'}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="px-4 py-4 md:px-6 md:py-6">
      {event.imageUrl && (
        <img
          src={`${API_URL}${event.imageUrl}`}
          alt={event.title}
          className="mb-5 h-40 w-full rounded-xl border border-gray-200 object-cover md:h-48"
        />
      )}

      <div className="mb-6 space-y-4">
        <div className="flex items-start gap-3">
          {event.iconUrl && (
            <img src={`${API_URL}${event.iconUrl}`} className="h-10 w-10 shrink-0 rounded-full object-cover" alt="" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-bold leading-tight text-gray-900 md:text-2xl">{event.title}</h1>
              <EventBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{formatDate(event.heldAt)} ・ {event.location}</p>
            <p className="mt-1 text-sm text-gray-600">
              予約: {event.reservedCount}{event.capacity ? ` / ${event.capacity}` : ''}人
              {(event.waitlistedCount ?? 0) > 0 && ` ・ キャンセル待ち ${event.waitlistedCount}人`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={() => downloadWithAuth(`${API_URL}/api/admin/events/${eventId}/export`, `event-${eventId}.csv`).catch(() => alert('ダウンロードに失敗しました'))}
            className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            CSV
          </button>
          <button
            onClick={sendRemind}
            disabled={reminding}
            className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {reminding ? '送信中...' : 'リマインド'}
          </button>
          <button
            onClick={() => setShowMessage(true)}
            className="min-h-11 col-span-2 sm:col-span-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            メッセージ送信
          </button>
          <Link
            href={`/admin/events/${eventId}/edit`}
            className="flex min-h-11 col-span-2 sm:col-span-1 items-center justify-center rounded-lg bg-[#06C755] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#05a847]"
          >
            編集
          </Link>
        </div>

        {event.remindedAt && (
          <p className="text-xs text-gray-400">最終リマインド送信: {formatDate(event.remindedAt)}</p>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4 md:px-6">
          <h2 className="font-semibold text-gray-900">予約一覧 ({reservations.length}件)</h2>
        </div>

        {reservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">まだ予約はありません</div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 md:hidden">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/members/${reservation.member.id}`} className="break-words text-sm font-bold text-[#06C755]">
                        {reservation.member.name ?? '未入力'}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                        <span>{reservation.member.grade ?? '-'}</span>
                        <span>{reservation.member.gender ?? '-'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <ReservationBadge status={reservation.status} />
                      {reservation.waitlistOrder && <p className="mt-1 text-xs text-gray-500">{reservation.waitlistOrder}番目</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">予約日時: {formatDate(reservation.reservedAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reservation.status === 'reserved' && (
                      <button onClick={() => updateStatus(reservation.id, 'attended')} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                        参加済みにする
                      </button>
                    )}
                    {['reserved', 'waitlisted', 'attended'].includes(reservation.status) && (
                      <button onClick={() => updateStatus(reservation.id, 'cancelled')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                        キャンセル
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
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
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <Link href={`/admin/members/${reservation.member.id}`} className="text-[#06C755] hover:underline">
                          {reservation.member.name ?? '未入力'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{reservation.member.grade ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{reservation.member.gender ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(reservation.reservedAt)}</td>
                      <td className="px-6 py-4">
                        <ReservationBadge status={reservation.status} />
                        {reservation.waitlistOrder && <span className="ml-1 text-xs text-gray-500">({reservation.waitlistOrder}番目)</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {reservation.status === 'reserved' && (
                            <button onClick={() => updateStatus(reservation.id, 'attended')} className="text-xs text-green-600 hover:underline">参加済みにする</button>
                          )}
                          {['reserved', 'waitlisted', 'attended'].includes(reservation.status) && (
                            <button onClick={() => updateStatus(reservation.id, 'cancelled')} className="text-xs text-red-600 hover:underline">キャンセル</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 md:px-6">
          <div>
            <h2 className="font-semibold text-gray-900">参加者の声</h2>
            <p className="mt-0.5 text-xs text-gray-400">公開ONの感想だけが公開ページに表示されます。</p>
          </div>
          <span className="shrink-0 text-xs text-gray-400">{reviews.length}件</span>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">まだ感想はありません</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:p-6">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Link href={`/admin/members/${review.member.id}`} className="text-sm font-semibold text-[#06C755] hover:underline">
                      {review.member.name ?? '未入力'}
                    </Link>
                    <span className="text-xs text-gray-400">{review.member.grade ?? '-'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${review.isPublished ? 'bg-green-50 text-[#06C755]' : 'bg-gray-100 text-gray-500'}`}>
                      {review.isPublished ? '公開中' : '非公開'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{review.content}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                </div>
                <button
                  onClick={() => toggleReview(review.id, !review.isPublished)}
                  className={`w-full shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors md:w-auto ${
                    review.isPublished
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-[#06C755] text-white hover:bg-[#05a847]'
                  }`}
                >
                  {review.isPublished ? '非公開にする' : '公開する'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
}
