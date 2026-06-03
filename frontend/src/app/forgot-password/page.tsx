'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'エラーが発生しました');
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">パスワードリセット</h1>
          <p className="text-sm text-gray-500 mt-1">登録済みのメールアドレスを入力してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">メールを送信しました</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                入力されたメールアドレスが登録されている場合、リセット用のリンクをお送りします。メールをご確認ください。
              </p>
              <Link href="/login" className="inline-block text-[#06C755] text-sm hover:underline">
                ログインに戻る
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
                  <input
                    required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com" className={inputClass} autoFocus
                  />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors">
                  {submitting ? '送信中...' : 'リセットメールを送信'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          <Link href="/login" className="text-[#06C755] hover:underline font-medium">ログインに戻る</Link>
        </p>
      </div>
    </div>
  );
}
