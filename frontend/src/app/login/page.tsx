'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { CLIENT_API_BASE, DIRECT_API_URL } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lineError')) {
      setError('LINEログインに失敗しました。もう一度お試しください。');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEmailNotVerified(false);
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.message === 'EMAIL_NOT_VERIFIED') {
          setEmailNotVerified(true);
          return;
        }
        throw new Error(data.message ?? 'ログインに失敗しました');
      }
      setToken(data.token);
      router.replace('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await fetch(`${BASE}/auth/resend-verification-by-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">主催者ログイン</h1>
          <p className="text-sm text-gray-500 mt-1">管理画面へようこそ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {emailNotVerified && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl space-y-2">
              <p className="font-semibold">メールアドレスが未確認です</p>
              <p className="text-xs">登録時に送信した確認メールのリンクをクリックしてください。</p>
              {!resent ? (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-amber-700 underline disabled:opacity-50"
                >
                  {resending ? '送信中...' : '確認メールを再送する'}
                </button>
              ) : (
                <p className="text-xs text-amber-700">確認メールを再送しました</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com" className={inputClass} autoFocus />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">パスワード</label>
                <Link href="/forgot-password" className="text-xs text-[#06C755] hover:underline">パスワードを忘れた方</Link>
              </div>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード" className={inputClass} />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors">
              {submitting ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">または</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <a
            href={`${DIRECT_API_URL}/api/auth/line`}
            className="block w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm text-center hover:bg-[#05a847] transition-colors"
          >
            LINEでログイン
          </a>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          アカウントをお持ちでない方は{' '}
          <Link href="/register" className="text-[#06C755] hover:underline font-medium">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
