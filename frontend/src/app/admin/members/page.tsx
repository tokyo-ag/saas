'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDateOnly, Member } from '@/lib/api';


const grades = ['大学生（18～22歳）', '社会人'];
const genders = ['男性', '女性'];
const levels = ['初心者', '中級', '上級'];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [level, setLevel] = useState('');

  async function load() {
    const data = await api.members.list({
      name: name || undefined,
      grade: grade || undefined,
      gender: gender || undefined,
      level: level || undefined,
    });
    setMembers(data);
  }

  useEffect(() => {
    api.members.list().then(setMembers).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleSearch() {
    setLoading(true);
    await load().catch(console.error).finally(() => setLoading(false));
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">参加者名簿</h1>
          <p className="text-sm text-gray-500 mt-1">参加者情報、トーク、参加回数を確認できます。</p>
        </div>
        {!loading && (
          <span className="shrink-0 rounded-full bg-[#06C755]/10 px-3 py-1.5 text-xs font-bold text-[#06C755]">
            登録者 {members.length}人
          </span>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            <option value="">年齢 すべて</option>
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
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            <option value="">レベル すべて</option>
            {levels.map((l) => <option key={l} value={l}>{l}</option>)}
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
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-sm">条件に一致する参加者がいません</p>
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {members.map((member) => (
                <article key={member.id} className={`p-4 ${member.blockedAt ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    {member.linePictureUrl ? (
                      <Image src={member.linePictureUrl} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" unoptimized />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0 mt-0.5">
                        {(member.lineDisplayName ?? member.name ?? '?')[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/members/${member.id}`} className="text-sm font-bold text-[#06C755] break-words">
                          {member.name ?? '未入力'}
                        </Link>
                        {member.blockedAt && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-500">ブロック中</span>
                        )}
                      </div>
                      {member.lineDisplayName && (
                        <p className="text-xs text-gray-400">LINE: {member.lineDisplayName}</p>
                      )}
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>年齢: {member.grade ?? '-'}</span>
                        <span>性別: {member.gender ?? '-'}</span>
                        {member.level && <span>レベル: {member.level}</span>}
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
                    <th className="px-6 py-3 text-left">名前 / LINE名</th>
                    <th className="px-6 py-3 text-left">年齢</th>
                    <th className="px-6 py-3 text-left">性別</th>
                    <th className="px-6 py-3 text-left">レベル</th>
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
                        <div className="flex items-center gap-2.5">
                          {member.linePictureUrl ? (
                            <Image src={member.linePictureUrl} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" unoptimized />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                              {(member.lineDisplayName ?? member.name ?? '?')[0]}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link href={`/admin/members/${member.id}`} className="font-medium text-[#06C755] hover:underline">
                                {member.name ?? '未入力'}
                              </Link>
                              {member.blockedAt && (
                                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-500">ブロック中</span>
                              )}
                            </div>
                            {member.lineDisplayName && (
                              <p className="text-[11px] text-gray-400 leading-tight">LINE: {member.lineDisplayName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{member.grade ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{member.gender ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{member.level ?? '-'}</td>
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
