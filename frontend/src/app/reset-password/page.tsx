'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) { setError('パスワードが一致しません'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) throw new Error(data.message ?? 'リセットに失敗しました');
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-500">無効なリンクです</p>
        <Link href="/forgot-password" className="text-[#06C755] text-sm hover:underline">パスワードリセットをやり直す</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">新しいパスワード</h1>
          <p className="text-sm text-gray-500 mt-1">8文字以上で入力してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">パスワードをリセットしました</p>
              <Link href="/login" className="inline-block bg-[#06C755] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#05a847] transition-colors">
                ログインする
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">新しいパスワード</label>
                  <input
                    required type="password" minLength={8} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8文字以上" className={inputClass} autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード（確認）</label>
                  <input
                    required type="password" value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="もう一度入力" className={inputClass}
                  />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors">
                  {submitting ? '更新中...' : 'パスワードを更新する'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">読み込み中...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
