'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, LiffProfile } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

export default function ProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        const loggedIn = await loginIfNeeded();
        if (loggedIn) uid = (await getLiffUserId()) ?? '';
      } else {
        uid = `demo-${tenantId}`;
      }

      if (!uid) {
        setLoading(false);
        return;
      }

      api.liff.profile(tenantId, uid)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    }
    init();
  }, [tenantId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#06C755] text-sm">読み込み中...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="px-4 pt-12 pb-3">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">プロフィール</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-5">
          {profile ? (
            <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#06C755]/10 flex items-center justify-center text-2xl shrink-0">👤</div>
                <div>
                  <p className="font-bold text-gray-900">{profile.name ?? '未登録'}</p>
                  <p className="text-xs text-gray-500">{[profile.grade, profile.gender].filter(Boolean).join(' ・ ')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
              イベントに予約するとプロフィールが作成されます。
            </div>
          )}
        </div>
      </div>
      <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
