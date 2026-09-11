'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ProfileFormPage() {
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
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">参加者フォーム</h1>
          <p className="mt-1 text-sm text-gray-500">初回予約時にどんなプロフィール情報を求めるかを設定します。</p>
        </div>

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
