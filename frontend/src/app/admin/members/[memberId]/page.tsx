'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, formatDate, formatDateOnly, Member, Reservation } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/Badge';

interface MemberDetail extends Member {
  reservations: (Reservation & { event: { id: string; title: string; heldAt: string; price: number } })[];
}

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MemberDetail>(`/admin/members/${memberId}`)
      .then(setMember)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!member) return <div className="text-center py-12 text-red-500">参加者が見つかりません</div>;

  const maskedLineId = member.lineUserId
    ? `${member.lineUserId.slice(0, 4)}${'*'.repeat(Math.max(0, member.lineUserId.length - 4))}`
    : '-';

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/members" className="text-gray-500 text-sm hover:text-gray-700">← 名簿に戻る</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{member.name ?? '未入力'}</h2>
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
                    <Link href={`/admin/events/${r.event.id}`} className="text-indigo-600 hover:underline">
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
