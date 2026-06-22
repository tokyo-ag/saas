'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, formatDateOnly, MemberDetail } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/StatusBadge';

function paymentLabel(reservation: MemberDetail['reservations'][number]) {
  if (reservation.paidAt) return '支払い済み';
  if (reservation.event.price === 0) return '無料';
  return '未払い';
}

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    api.members.get(memberId)
      .then(setMember)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [memberId]);

  async function handleBlock() {
    if (!member) return;

    const isBlocked = !!member.blockedAt;
    const name = member.name ?? '未入力';
    const message = isBlocked
      ? `${name}さんのブロックを解除しますか？`
      : `${name}さんをブロックしますか？\n今後この団体でのイベント予約ができなくなります。`;

    if (!confirm(message)) return;

    setBlocking(true);
    try {
      const updated = isBlocked
        ? await api.members.unblock(member.id)
        : await api.members.block(member.id);
      setMember((prev) => (prev ? { ...prev, blockedAt: updated.blockedAt } : prev));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBlocking(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  if (!member) {
    return <div className="px-4 py-12 text-center text-sm text-red-500">参加者が見つかりません</div>;
  }

  const isBlocked = !!member.blockedAt;
  const maskedLineId = member.lineUserId
    ? `${member.lineUserId.slice(0, 4)}${'*'.repeat(Math.max(0, member.lineUserId.length - 4))}`
    : '-';

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin/members" className="text-sm font-medium text-gray-500 hover:text-gray-800">
          参加者名簿に戻る
        </Link>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link
            href={`/admin/members/${memberId}/messages`}
            className="rounded-lg bg-[#06C755]/10 px-4 py-2 text-center text-sm font-medium text-[#06C755] transition-colors hover:bg-[#06C755]/20"
          >
            トーク
          </Link>
          <button
            onClick={handleBlock}
            disabled={blocking}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isBlocked
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {blocking ? '処理中...' : isBlocked ? 'ブロック解除' : 'ブロック'}
          </button>
        </div>
      </div>

      <section className={`mb-5 rounded-xl border bg-white p-4 shadow-sm md:p-6 ${isBlocked ? 'border-red-200' : 'border-gray-200'}`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {member.linePictureUrl ? (
              <Image src={member.linePictureUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover shrink-0" unoptimized />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400 shrink-0">
                {(member.lineDisplayName ?? member.name ?? '?')[0]}
              </div>
            )}
            <div>
              <h1 className="break-words text-2xl font-bold text-gray-900">{member.name ?? '未入力'}</h1>
              {member.lineDisplayName && (
                <p className="text-xs text-gray-400">LINE: {member.lineDisplayName}</p>
              )}
              <p className="text-xs text-gray-400">LINE ID: {maskedLineId}</p>
            </div>
          </div>
          {isBlocked && (
            <span className="w-fit rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
              ブロック中
            </span>
          )}
        </div>

        {isBlocked && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {new Date(member.blockedAt!).toLocaleDateString('ja-JP')} にブロックされました。この参加者はイベント予約ができません。
          </div>
        )}

        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <dt className="text-gray-500">学年</dt>
            <dd className="mt-1 font-medium text-gray-900">{member.grade ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">性別</dt>
            <dd className="mt-1 font-medium text-gray-900">{member.gender ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">登録日</dt>
            <dd className="mt-1 font-medium text-gray-900">{formatDateOnly(member.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">参加回数</dt>
            <dd className="mt-1 font-medium text-gray-900">{member.eventCount ?? member.reservations.length}回</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4 md:px-6">
          <h2 className="font-semibold text-gray-900">参加履歴</h2>
        </div>

        {member.reservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">参加履歴はまだありません</div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 md:hidden">
              {member.reservations.map((reservation) => (
                <article key={reservation.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/events/${reservation.event.id}`}
                      className="min-w-0 break-words font-semibold text-gray-900 hover:text-[#06C755]"
                    >
                      {reservation.event.title}
                    </Link>
                    <ReservationBadge status={reservation.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-500">
                    <span>開催</span>
                    <span className="text-right text-gray-700">{formatDate(reservation.event.heldAt)}</span>
                    <span>支払い</span>
                    <span className="text-right text-gray-700">{paymentLabel(reservation)}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">イベント名</th>
                    <th className="px-6 py-3 text-left">開催日時</th>
                    <th className="px-6 py-3 text-left">ステータス</th>
                    <th className="px-6 py-3 text-left">支払い</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {member.reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/admin/events/${reservation.event.id}`} className="font-medium text-[#06C755] hover:underline">
                          {reservation.event.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(reservation.event.heldAt)}</td>
                      <td className="px-6 py-4">
                        <ReservationBadge status={reservation.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-600">{paymentLabel(reservation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
