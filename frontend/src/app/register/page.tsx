'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CLIENT_API_BASE, DIRECT_API_URL } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

export default function RegisterPage() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '登録に失敗しました');
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-[#06C755]/10 rounded-full flex items-center justify-center mx-auto">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">確認メールを送信しました</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              <span className="font-medium text-gray-700">{email}</span> に確認メールを送りました。<br />
              メール内のリンクをクリックして登録を完了してください。
            </p>
          </div>
          <Link href="/login" className="inline-block text-sm text-[#06C755] hover:underline font-medium">
            ログインページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">主催者登録</h1>
          <p className="text-sm text-gray-500 mt-1">無料でイベント管理を始める</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <a
            href={`${DIRECT_API_URL}/api/auth/line`}
            className="block w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm text-center hover:bg-[#05a847] transition-colors"
          >
            LINEで登録する
          </a>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">または</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                minLength={8}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors"
            >
              {submitting ? '登録中...' : '無料で登録する'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            登録することで、
            <Link href="/terms" className="underline">利用規約</Link>
            および
            <Link href="/privacy" className="underline">プライバシーポリシー</Link>
            に同意したものとみなします。
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-[#06C755] hover:underline font-medium">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
