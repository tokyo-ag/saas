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

  const [pendingToken, setPendingToken] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('sms');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

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
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'ログインに失敗しました');
      setPendingToken(data.pendingToken);
      setMaskedDestination(data.maskedDestination ?? '');
      setChannel(data.channel === 'email' ? 'email' : 'sms');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
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
      const payload = decodeJwt<{ isSuperadmin?: boolean }>(data.token);
      if (!payload?.isSuperadmin) throw new Error('スーパー管理者権限がありません');
      setToken(data.token);
      applySuperadminSession(data.token);
      router.push('/superadmin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '確認コードが正しくありません');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendCode() {
    setResending(true);
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
      setMaskedDestination(data.maskedDestination ?? '');
      setChannel(data.channel === 'email' ? 'email' : 'sms');
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '再送に失敗しました');
    } finally {
      setResending(false);
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
            <form onSubmit={handleVerify} className="space-y-4">
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <div>
                <p className="text-sm text-gray-700 mb-1.5">
                  {maskedDestination
                    ? `${maskedDestination} 宛に${channel === 'email' ? 'メール' : 'SMS'}で確認コードを送信しました。`
                    : `${channel === 'email' ? 'メール' : 'SMS'}で確認コードを送信しました。`}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">確認コード（6桁）</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  autoFocus
                />
              </div>
              <button
                type="submit" disabled={verifying || code.length !== 6}
                className="w-full bg-[#06C755] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors"
              >
                {verifying ? '確認中...' : 'ログイン'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setPendingToken(''); setCode(''); setError(''); }}
                  className="text-gray-400 hover:underline"
                >
                  戻る
                </button>
                {resent ? (
                  <span className="text-gray-400">再送しました</span>
                ) : (
                  <button type="button" onClick={handleResendCode} disabled={resending}
                    className="text-[#06C755] hover:underline disabled:opacity-50">
                    {resending ? '再送中...' : 'コードを再送する'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
