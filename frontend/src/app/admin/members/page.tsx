'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, formatDateOnly, Member } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (grade) params.set('grade', grade);
    if (gender) params.set('gender', gender);
    const data = await apiFetch<Member[]>(`/admin/members?${params}`);
    setMembers(data);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  const grades = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">参加者名簿</h2>
        <a
          href={`${API_URL}/api/admin/members/export`}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          名簿CSVダウンロード
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex gap-3">
        <input
          type="text" placeholder="名前で検索" value={name} onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={grade} onChange={(e) => setGrade(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">学年 すべて</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">性別 すべて</option>
          <option value="男性">男性</option>
          <option value="女性">女性</option>
          <option value="その他・回答しない">その他・回答しない</option>
        </select>
        <button
          onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          検索
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400">参加者がいません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">名前</th>
                <th className="px-6 py-3 text-left">学年</th>
                <th className="px-6 py-3 text-left">性別</th>
                <th className="px-6 py-3 text-left">登録日</th>
                <th className="px-6 py-3 text-left">参加回数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/members/${m.id}`} className="text-indigo-600 font-medium hover:underline">
                      {m.name ?? '未入力'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{m.grade ?? '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{m.gender ?? '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDateOnly(m.createdAt)}</td>
                  <td className="px-6 py-4 text-gray-600">{m.eventCount ?? 0} 回</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
