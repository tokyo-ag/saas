'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { initLiff, getLiffUserId } from '@/lib/liff';

const GRADES = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];
const GENDERS = ['男性', '女性', 'その他・回答しない'];

export default function ProfileEditPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();

  const [lineUserId, setLineUserId] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      const uid = ok ? (await getLiffUserId()) ?? '' : 'demo-user';
      setLineUserId(uid);
      if (uid) {
        const prof = await api.liff.profile(tenantId, uid).catch(() => null);
        if (prof) {
          setName(prof.name ?? '');
          setGrade(prof.grade ?? '');
          setGender(prof.gender ?? '');
        }
      }
      setLoading(false);
    }
    init();
  }, [tenantId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.liff.updateProfile(tenantId, lineUserId, { name, grade, gender });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cp)] focus:border-transparent';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--cp)] text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cp-20)]">
      <div className="bg-[var(--cp)] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl leading-none">‹</button>
        <h1 className="text-base font-bold">プロフィール編集</h1>
      </div>

      <div className="px-4 py-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">お名前 <span className="text-red-400">*</span></label>
              <input required minLength={1} maxLength={50}
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="山田太郎"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">学年 <span className="text-red-400">*</span></label>
              <select required value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                <option value="">選択してください</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">性別 <span className="text-red-400">*</span></label>
              <div className="flex gap-4">
                {GENDERS.map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="gender" value={g} required checked={gender === g} onChange={() => setGender(g)} className="accent-[var(--cp)]" />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={submitting}
            className="w-full bg-[var(--cp)] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[var(--cp-h)] transition-colors shadow-sm"
          >
            {submitting ? '保存中...' : '保存する'}
          </button>
        </form>
      </div>
    </div>
  );
}
