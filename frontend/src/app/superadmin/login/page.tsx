'use client';

import { useState } from 'react';
import { decodeJwt, setToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [maskedDestination, setMaskedDestination] = useState('');
  const [code, setCode] = useState('');

  function applySuperadminSession(token: string) {
    document.cookie = [
      `sa_token=${token}`,
      'path=/',
      'SameSite=Strict',
      'max-age=86400',
      location.protocol === 'https:' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/superadmin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'ログインに失敗しました');
      setPendingToken(data.pendingToken);
      setMaskedDestination(data.maskedDestination ?? email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '確認に失敗しました');
      const payload = decodeJwt<{ isSuperadmin?: boolean }>(data.token);
      if (!data.token || !payload?.isSuperadmin) {
        throw new Error('スーパー管理者権限がありません');
      }
      setToken(data.token);
      applySuperadminSession(data.token);
      router.replace('/superadmin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '確認に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingToken) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/resend-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken }),
      });
      if (!res.ok) throw new Error('再送信に失敗しました');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '再送信に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">COMIU 管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理者専用ページ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {!pendingToken ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-[#06C755] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium">{maskedDestination}</span> に送信した確認コードを入力してください
              </p>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">確認コード（6桁）</label>
                <input
                  type="text" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="submit" disabled={loading || code.length !== 6}
                className="w-full bg-[#06C755] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors"
              >
                {loading ? '確認中...' : '確認'}
              </button>
              <button
                type="button" onClick={handleResend} disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                コードを再送信
              </button>
              <button
                type="button" onClick={() => { setPendingToken(null); setCode(''); setError(''); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                ← 戻る
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
