'use client';

import { useState } from 'react';
import { setToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'email' | 'line'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'ログインに失敗しました');
      setToken(data.token);
      router.push('/superadmin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
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
          <h1 className="text-2xl font-bold text-gray-900">スーパー管理者</h1>
          <p className="text-sm text-gray-500 mt-1">管理者専用ページ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab('email')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'email' ? 'text-[#06C755] border-b-2 border-[#06C755]' : 'text-gray-500'}`}
            >
              メール
            </button>
            <button
              onClick={() => setTab('line')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'line' ? 'text-[#06C755] border-b-2 border-[#06C755]' : 'text-gray-500'}`}
            >
              LINE
            </button>
          </div>

          <div className="p-8">
            {tab === 'email' ? (
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
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">LINEアカウントでログインします</p>
                <a
                  href={`${BASE}/api/auth/line`}
                  className="flex items-center justify-center gap-2.5 w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] transition-colors"
                >
                  <span className="text-lg leading-none">💬</span>
                  LINEでログイン
                </a>
                <p className="text-xs text-gray-400 text-center">※ LINEログイン後は管理画面からスーパー管理者ページへ移動してください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
