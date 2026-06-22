'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, downloadWithAuth, API_URL, Event, Reservation, AdminEventReview } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
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

  const load = useCallback(async () => {
    const [eventData, reservationList, reviewList] = await Promise.all([
      api.events.get(eventId),
      api.events.reservations(eventId),
      api.events.reviews(eventId),
    ]);
    setEvent(eventData);
    setReservations(reservationList as EventReservation[]);
    setReviews(reviewList);
  }, [eventId]);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  async function updateStatus(reservationId: string, status: string) {
    try {
      await api.reservations.updateStatus(reservationId, status);
      const updated = await api.events.reservations(eventId);
      setReservations(updated as EventReservation[]);
    } catch {
      alert('ステータスの更新に失敗しました');
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
    <div className="px-4 py-4 md:px-6 md:py-6">
      {event.imageUrl && (
        <Image
          src={imgUrl(event.imageUrl, API_URL)!}
          alt={event.title}
          width={1200}
          height={1500}
          className="mb-5 w-full rounded-xl border border-gray-200 object-cover aspect-[4/5]"
          unoptimized
        />
      )}

      <div className="mb-6 space-y-4">
        <div className="flex items-start gap-3">
          {event.iconUrl && (
            <Image src={`${API_URL}${event.iconUrl}`} width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" alt="" unoptimized />
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

        <div>
          <Link
            href={`/admin/events/${eventId}/edit`}
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#06C755] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#05a847] sm:w-auto sm:px-6"
          >
            編集
          </Link>
        </div>
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
                    <div className="flex items-start gap-2.5 min-w-0">
                      {reservation.member.linePictureUrl ? (
                        <Image src={reservation.member.linePictureUrl} alt="" width={36} height={36} className="w-9 h-9 rounded-full shrink-0 object-cover" unoptimized />
                      ) : (
                        <div className="w-9 h-9 rounded-full shrink-0 bg-gray-200 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/admin/members/${reservation.member.id}`} className="break-words text-sm font-bold text-[#06C755]">
                          {reservation.member.lineDisplayName ?? reservation.member.name ?? '未入力'}
                          {reservation.member.lineDisplayName && reservation.member.name && (
                            <span className="font-normal text-gray-500"> / {reservation.member.name}</span>
                          )}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>{reservation.member.grade ?? '-'}</span>
                          <span>{reservation.member.gender ?? '-'}</span>
                        </div>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {reservation.member.linePictureUrl ? (
                            <Image src={reservation.member.linePictureUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full shrink-0 object-cover" unoptimized />
                          ) : (
                            <div className="w-8 h-8 rounded-full shrink-0 bg-gray-200 flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link href={`/admin/members/${reservation.member.id}`} className="font-medium text-[#06C755] hover:underline">
                              {reservation.member.lineDisplayName ?? reservation.member.name ?? '未入力'}
                              {reservation.member.lineDisplayName && reservation.member.name && (
                                <span className="font-normal text-gray-500"> / {reservation.member.name}</span>
                              )}
                            </Link>
                          </div>
                        </div>
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
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-sm font-semibold text-gray-800">データエクスポート</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">参加者一覧・予約状況をCSVファイルでダウンロードできます。名簿管理や出欠確認にご活用ください。</p>
        <button
          onClick={() => downloadWithAuth(`${API_URL}/api/admin/events/${eventId}/export`, `event-${eventId}.csv`).catch(() => alert('ダウンロードに失敗しました'))}
          className="mt-3 flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSVダウンロード
        </button>
      </section>
    </div>
    </>
  );
}
