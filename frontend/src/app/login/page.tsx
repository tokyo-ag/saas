'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

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

  const [pendingToken, setPendingToken] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [codeResent, setCodeResent] = useState(false);

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
      setPendingToken(data.pendingToken);
      setMaskedDestination(data.maskedDestination ?? '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '確認コードが正しくありません');
      setToken(data.token);
      router.replace('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '確認コードが正しくありません');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendCode() {
    setResendingCode(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/auth/resend-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '再送に失敗しました');
      setPendingToken(data.pendingToken);
      setCodeResent(true);
      setTimeout(() => setCodeResent(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '再送に失敗しました');
    } finally {
      setResendingCode(false);
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

          {!pendingToken ? (
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
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 mb-1.5">
                  {maskedDestination ? `${maskedDestination} 宛に確認コードを送信しました。` : '確認コードを送信しました。'}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">確認コード（6桁）</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={`${inputClass} tracking-[0.5em] text-center text-lg`}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={verifying || code.length !== 6}
                className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors">
                {verifying ? '確認中...' : 'ログイン'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setPendingToken(''); setCode(''); setError(''); }}
                  className="text-gray-400 hover:underline"
                >
                  メールアドレスを変更する
                </button>
                {codeResent ? (
                  <span className="text-gray-400">再送しました</span>
                ) : (
                  <button type="button" onClick={handleResendCode} disabled={resendingCode}
                    className="text-[#06C755] hover:underline disabled:opacity-50">
                    {resendingCode ? '再送中...' : 'コードを再送する'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          アカウントをお持ちでない方は{' '}
          <Link href="/register" className="text-[#06C755] hover:underline font-medium">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
