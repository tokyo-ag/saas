'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiFetch, formatDate, formatDateOnly, Member, Reservation } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/Badge';

interface MemberDetail extends Member {
  reservations: (Reservation & { event: { id: string; title: string; heldAt: string; price: number } })[];
}

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    apiFetch<MemberDetail>(`/admin/members/${memberId}`)
      .then(setMember)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [memberId]);

  async function handleBlock() {
    if (!member) return;
    const isBlocked = !!member.blockedAt;
    const msg = isBlocked
      ? `${member.name ?? '未入力'}さんのブロックを解除しますか？`
      : `${member.name ?? '未入力'}さんをブロックしますか？\n今後この団体でのイベント予約ができなくなります。`;
    if (!confirm(msg)) return;
    setBlocking(true);
    try {
      const updated = isBlocked
        ? await api.members.unblock(member.id)
        : await api.members.block(member.id);
      setMember((prev) => prev ? { ...prev, blockedAt: updated.blockedAt } : prev);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBlocking(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!member) return <div className="text-center py-12 text-red-500">参加者が見つかりません</div>;

  const isBlocked = !!member.blockedAt;
  const maskedLineId = member.lineUserId
    ? `${member.lineUserId.slice(0, 4)}${'*'.repeat(Math.max(0, member.lineUserId.length - 4))}`
    : '-';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/members" className="text-gray-500 text-sm hover:text-gray-700">← 名簿に戻る</Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/members/${memberId}/messages`}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 transition-colors"
          >
            💬 メッセージ
          </Link>
        <button
          onClick={handleBlock}
          disabled={blocking}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            isBlocked
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
          }`}
        >
          {blocking ? '処理中...' : isBlocked ? 'ブロック解除' : '🚫 ブロック'}
        </button>
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 ${isBlocked ? 'border-red-200' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{member.name ?? '未入力'}</h2>
          {isBlocked && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
              🚫 ブロック中
            </span>
          )}
        </div>
        {isBlocked && (
          <div className="mb-4 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {new Date(member.blockedAt!).toLocaleDateString('ja-JP')} にブロックされました。この参加者はイベント予約ができません。
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">学年</p>
            <p className="text-gray-900 font-medium mt-0.5">{member.grade ?? '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">性別</p>
            <p className="text-gray-900 font-medium mt-0.5">{member.gender ?? '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">登録日</p>
            <p className="text-gray-900 font-medium mt-0.5">{formatDateOnly(member.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">LINE ID</p>
            <p className="text-gray-900 font-mono text-xs mt-0.5">{maskedLineId}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">参加履歴</h3>
        </div>
        {member.reservations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">参加履歴がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">イベント名</th>
                <th className="px-6 py-3 text-left">開催日時</th>
                <th className="px-6 py-3 text-left">ステータス</th>
                <th className="px-6 py-3 text-left">支払い</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {member.reservations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/events/${r.event.id}`} className="text-[#06C755] hover:underline">
                      {r.event.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(r.event.heldAt)}</td>
                  <td className="px-6 py-4"><ReservationBadge status={r.status} /></td>
                  <td className="px-6 py-4 text-gray-600">
                    {r.paidAt ? '支払済' : r.event.price === 0 ? '無料' : '未払い'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
