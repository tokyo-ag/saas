'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function LineCompleteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lineToken = searchParams.get('lineToken') ?? '';

  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/line/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineToken, orgName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '登録に失敗しました');
      setToken(data.token);
      router.push('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">💬</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">登録を完了する</h1>
          <p className="text-sm text-gray-500 mt-1">LINEアカウントと紐づける団体名を入力してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                団体名 <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="〇〇サークル"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !lineToken}
              className="w-full bg-[#06C755] text-white py-3 rounded-lg font-medium text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors"
            >
              {submitting ? '登録中...' : '登録を完了する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LineCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    }>
      <LineCompleteInner />
    </Suspense>
  );
}
