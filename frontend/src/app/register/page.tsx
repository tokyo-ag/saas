'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) { setError('パスワードが一致しません'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '登録に失敗しました');
      setToken(data.token);
      router.replace('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">主催者アカウント登録</h1>
          <p className="text-sm text-gray-500 mt-1">無料で始められます</p>
        </div>

        {/* ステップ表示 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-[#06C755] text-white' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              {s < 2 && <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-[#06C755]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}

          {step === 1 ? (
            /* ── Step 1: 団体名 ── */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">団体・サークル名 <span className="text-red-500">*</span></label>
                <input
                  required autoFocus value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  placeholder="例: 大学生交流サークル Connect"
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1">後から変更できます</p>
              </div>
              <button
                onClick={() => { if (!orgName.trim()) { setError('団体名を入力してください'); return; } setError(''); setStep(2); }}
                className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] transition-colors"
              >
                次へ →
              </button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">または</span></div>
              </div>
              <a
                href={`${BASE}/api/auth/line`}
                className="flex items-center justify-center gap-2.5 w-full border border-[#06C755] text-[#06C755] py-3 rounded-xl font-semibold text-sm hover:bg-green-50 transition-colors"
              >
                <span className="text-base leading-none">💬</span>
                LINEで登録
              </a>
            </div>
          ) : (
            /* ── Step 2: メール/パスワード ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1">
                ‹ 戻る
              </button>
              <p className="text-sm font-semibold text-gray-700">「{orgName}」のアカウント情報</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス <span className="text-red-500">*</span></label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード <span className="text-red-500">*</span></label>
                <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード（確認）<span className="text-red-500">*</span></label>
                <input required type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="もう一度入力" className={inputClass} />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#05a847] disabled:opacity-50 transition-colors">
                {submitting ? '登録中...' : '無料で始める'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          既にアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-[#06C755] hover:underline font-medium">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
