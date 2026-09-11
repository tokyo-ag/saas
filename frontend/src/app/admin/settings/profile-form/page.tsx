'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const tabs = [
  { label: '団体情報', href: '/admin/settings' },
  { label: '参加者フォーム', href: '/admin/settings/profile-form', active: true },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe' },
  { label: 'プラン', href: '/admin/settings/plan' },
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

export default function ProfileFormSettingsPage() {
  const [requireProfile, setRequireProfile] = useState<boolean | null>(null);

  useEffect(() => {
    api.tenant.get().then((t) => setRequireProfile(t.requireProfile !== false)).catch(() => {});
  }, []);

  async function toggleRequireProfile() {
    if (requireProfile === null) return;
    const next = !requireProfile;
    setRequireProfile(next);
    try {
      await api.tenant.update({ requireProfile: next });
    } catch (err: any) {
      setRequireProfile(!next);
      alert(err?.message ?? '設定の更新に失敗しました');
    }
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {requireProfile === null ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">プロフィール入力を必須にする</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  ONだと初回予約時に名前・学年・性別の入力が必須になります。OFFだとイベント詳細画面から「予約する」のワンタップだけで予約が完了し、マイページのプロフィール編集は非表示になります（予約一覧・キャンセルは表示されます）。
                </p>
              </div>
              <button
                type="button"
                onClick={toggleRequireProfile}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  requireProfile
                    ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                {requireProfile ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
