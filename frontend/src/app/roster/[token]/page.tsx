'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, formatDate, PublicRoster } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/StatusBadge';

export default function RosterSharePage() {
  const { token } = useParams<{ token: string }>();
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.public.roster(token)
      .then(setRoster)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    );
  }

  if (notFound || !roster) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-lg font-bold text-gray-900">このリンクは無効です</p>
        <p className="text-sm text-gray-500">共有が停止されたか、リンクが正しくない可能性があります。</p>
      </div>
    );
  }

  const { event, reservations } = roster;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <p className="text-xs opacity-80">参加者名簿</p>
        <h1 className="text-base font-bold mt-1">{event.title}</h1>
        <p className="text-xs mt-1 opacity-90">{formatDate(event.heldAt)} ・ {event.location}</p>
      </div>

      <div className="px-4 py-5">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">参加者一覧 ({reservations.length}件)</h2>
          </div>

          {reservations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">まだ参加者はいません</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {reservations.map((r, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.name ?? '未入力'}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>{r.grade ?? '-'}</span>
                          <span>{r.gender ?? '-'}</span>
                          {event.levelEnabled && <span>{r.level ?? '-'}</span>}
                        </div>
                      </div>
                      <ReservationBadge status={r.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left">名前</th>
                      <th className="px-6 py-3 text-left">年齢</th>
                      <th className="px-6 py-3 text-left">性別</th>
                      {event.levelEnabled && <th className="px-6 py-3 text-left">レベル</th>}
                      <th className="px-6 py-3 text-left">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reservations.map((r, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 font-medium text-gray-900">{r.name ?? '未入力'}</td>
                        <td className="px-6 py-4 text-gray-600">{r.grade ?? '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{r.gender ?? '-'}</td>
                        {event.levelEnabled && <td className="px-6 py-4 text-gray-600">{r.level ?? '-'}</td>}
                        <td className="px-6 py-4">
                          <ReservationBadge status={r.status} />
                          {r.waitlistOrder && <span className="ml-1 text-xs text-gray-500">({r.waitlistOrder}番目)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
