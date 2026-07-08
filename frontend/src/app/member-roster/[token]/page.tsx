'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, formatDateOnly, PublicMemberRoster } from '@/lib/api';

export default function MemberRosterSharePage() {
  const { token } = useParams<{ token: string }>();
  const [roster, setRoster] = useState<PublicMemberRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.public.memberRoster(token)
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

  const { tenant, members } = roster;
  const hasLevel = members.some((m) => m.level);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <p className="text-xs opacity-80">参加者名簿</p>
        <h1 className="text-base font-bold mt-1">{tenant.name}</h1>
      </div>

      <div className="px-4 py-5">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">参加者一覧 ({members.length}人)</h2>
          </div>

          {members.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">まだ参加者はいません</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {members.map((m, i) => (
                  <div key={i} className="p-4">
                    <p className="text-sm font-bold text-gray-900">{m.name ?? '未入力'}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span>{m.grade ?? '-'}</span>
                      <span>{m.gender ?? '-'}</span>
                      {hasLevel && <span>{m.level ?? '-'}</span>}
                      <span>参加{m.eventCount}回</span>
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
                      {hasLevel && <th className="px-6 py-3 text-left">レベル</th>}
                      <th className="px-6 py-3 text-left">登録日</th>
                      <th className="px-6 py-3 text-left">参加回数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((m, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 font-medium text-gray-900">{m.name ?? '未入力'}</td>
                        <td className="px-6 py-4 text-gray-600">{m.grade ?? '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{m.gender ?? '-'}</td>
                        {hasLevel && <td className="px-6 py-4 text-gray-600">{m.level ?? '-'}</td>}
                        <td className="px-6 py-4 text-gray-500">{formatDateOnly(m.createdAt)}</td>
                        <td className="px-6 py-4 text-gray-600">{m.eventCount}回</td>
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
