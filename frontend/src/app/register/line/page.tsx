'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

function RegisterLineInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lineToken = searchParams.get('lineToken') ?? '';
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lineToken) {
      setError('LINE認証情報が見つかりません。もう一度LINEでログインしてください。');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/auth/line/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineToken, orgName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'LINE登録に失敗しました');
      setToken(data.token);
      router.replace('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'LINE登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">LINE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LINEで主催者登録</h1>
          <p className="text-sm text-gray-500 mt-1">団体名を入力して登録を完了します</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {!lineToken && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
              LINE認証情報がありません。ログインページからもう一度LINEでログインしてください。
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">団体名・サークル名</label>
              <input
                required
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="例）東京バドミントンサークル"
                maxLength={100}
                className={inputClass}
                autoFocus
                disabled={!lineToken || submitting}
              />
            </div>
            <button
              type="submit"
              disabled={!lineToken || submitting}
              className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors"
            >
              {submitting ? '登録中...' : '登録して管理画面へ'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          メールで登録する場合は{' '}
          <Link href="/register" className="text-[#06C755] hover:underline font-medium">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterLinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      }
    >
      <RegisterLineInner />
    </Suspense>
  );
}
