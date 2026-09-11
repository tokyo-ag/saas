'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SaveToast } from '@/components/ui/SaveToast';

const tabs = [
  { label: '団体情報', href: '/admin/settings' },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe' },
  { label: 'プラン', href: '/admin/settings/plan' },
  { label: 'アカウント', href: '/admin/settings/account', active: true },
];

function SettingsTabs() {
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 px-4 md:mx-0 md:px-0">
      {tabs.map((tab) =>
        tab.active ? (
          <span key={tab.href} className="whitespace-nowrap border-b-2 border-[#06C755] px-4 py-2 text-sm font-medium text-[#06C755]">
            {tab.label}
          </span>
        ) : (
          <Link key={tab.href} href={tab.href} className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export default function AccountSettingsPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.auth.getMe().then((me) => {
      setHasPassword(me.hasPassword);
      if (me.email) setEmail(me.email);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }
    setSaving(true);
    try {
      await api.auth.setEmailPassword(email, password);
      setHasPassword(true);
      setPassword('');
      setConfirm('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (hasPassword === null) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <SaveToast show={saved} />

        <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">メールアドレス・パスワード</h2>
          {hasPassword ? (
            <div className="space-y-2">
              {email && (
                <p className="text-sm text-gray-700">
                  <span className="text-xs text-gray-400 mr-1">メールアドレス:</span>
                  {email}
                </p>
              )}
              <p className="text-sm text-gray-500">
                パスワードは設定済みです。変更する場合は
                <Link href="/forgot-password" className="ml-1 font-medium text-[#06C755] hover:underline">
                  パスワードリセット
                </Link>
                をご利用ください。
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                メールアドレスとパスワードを登録すると、LINE設定などのセキュリティ保護された操作が利用できるようになります。
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">パスワード（8文字以上）</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">パスワード（確認）</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !email || !password || !confirm}
                  className="w-full rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
                >
                  {saving ? '保存中...' : '登録する'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
