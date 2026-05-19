'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDateOnly, downloadWithAuth, API_URL, Member } from '@/lib/api';


const grades = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];
const genders = ['男性', '女性', 'その他・回答しない'];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');

  async function load() {
    const data = await api.members.list({ name: name || undefined, grade: grade || undefined, gender: gender || undefined });
    setMembers(data);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleSearch() {
    setLoading(true);
    await load().catch(console.error).finally(() => setLoading(false));
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">参加者名簿</h1>
          <p className="text-sm text-gray-500 mt-1">参加者情報、トーク、参加回数を確認できます。</p>
        </div>
        <button
          onClick={() => downloadWithAuth(`${API_URL}/api/admin/members/export`, 'members.csv').catch(() => alert('ダウンロードに失敗しました'))}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          名簿CSV
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="名前で検索"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            <option value="">学年 すべて</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            <option value="">性別 すべて</option>
            {genders.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button
            onClick={handleSearch}
            className="min-h-11 rounded-lg bg-[#06C755] px-4 text-sm font-bold text-white hover:bg-[#05a847]"
          >
            検索
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400">参加者がいません</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {members.map((member) => (
                <article key={member.id} className={`p-4 ${member.blockedAt ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/members/${member.id}`} className="text-sm font-bold text-[#06C755] break-words">
                          {member.name ?? '未入力'}
                        </Link>
                        {member.blockedAt && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-500">ブロック中</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>学年: {member.grade ?? '-'}</span>
                        <span>性別: {member.gender ?? '-'}</span>
                        <span>登録: {formatDateOnly(member.createdAt)}</span>
                        <span>参加: {member.eventCount ?? 0}回</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href={`/admin/members/${member.id}/messages`}
                      className="rounded-lg bg-[#06C755]/10 px-3 py-2 text-center text-xs font-bold text-[#06C755]"
                    >
                      トーク
                    </Link>
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold text-gray-600"
                    >
                      詳細
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">ID</th>
                    <th className="px-6 py-3 text-left">名前</th>
                    <th className="px-6 py-3 text-left">学年</th>
                    <th className="px-6 py-3 text-left">性別</th>
                    <th className="px-6 py-3 text-left">登録日</th>
                    <th className="px-6 py-3 text-left">参加回数</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id} className={`hover:bg-gray-50 ${member.blockedAt ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 text-xs font-mono text-gray-400">{member.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/members/${member.id}`} className="font-medium text-[#06C755] hover:underline">
                            {member.name ?? '未入力'}
                          </Link>
                          {member.blockedAt && (
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-500">ブロック中</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{member.grade ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{member.gender ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDateOnly(member.createdAt)}</td>
                      <td className="px-6 py-4 text-gray-600">{member.eventCount ?? 0}回</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/members/${member.id}/messages`} className="rounded-lg bg-[#06C755]/10 px-3 py-1.5 text-xs font-medium text-[#06C755] hover:bg-[#06C755]/20">トーク</Link>
                          <Link href={`/admin/members/${member.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">詳細</Link>
                        </div>
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
  );
}
