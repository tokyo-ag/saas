'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { api, LiffProfile } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded, scanQrCode } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

export default function ProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        if (!lineUserId) await loginIfNeeded();
        uid = (await getLiffUserId()) ?? '';
      } else {
        uid = `demo-${tenantId}`;
      }
      setLineUserId(uid);
      if (uid) {
        api.liff.profile(tenantId, uid)
          .then(setProfile)
          .catch(() => setProfile(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
    init();
  }, [tenantId]);

  async function handleScan() {
    setError('');
    setScanning(true);
    try {
      const value = await scanQrCode();
      if (value) {
        router.push(`/liff/${tenantId}/connect/${value}`);
      } else {
        setError('QRコードを読み取れませんでした');
      }
    } catch {
      setError('カメラを起動できませんでした');
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#06C755] text-sm">読み込み中...</div>;
  }

  return (
    <>
    <div className="min-h-screen bg-[#F5F5F5] pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="px-4 pt-12 pb-3">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Profile</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {profile ? (
          <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[[#06C755]/10] flex items-center justify-center text-2xl shrink-0">👤</div>
              <div>
                <p className="font-bold text-gray-900">{profile.name ?? '（名前未登録）'}</p>
                <p className="text-xs text-gray-500">{[profile.grade, profile.gender].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
            イベントに予約するとプロフィールが作成されます
          </div>
        )}

        {profile && (
          <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-gray-700">自分のQRコード</p>
            <div className="p-3 bg-white border border-gray-200 rounded-xl">
              <QRCode value={profile.id} size={180} />
            </div>
            <p className="text-xs text-gray-400 text-center">相手にスキャンしてもらおう</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <button
          onClick={handleScan}
          disabled={scanning || !profile}
          className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span className="text-xl">📷</span>
          {scanning ? 'カメラ起動中...' : '相手のQRをスキャン'}
        </button>
      </div>

    </div>
    <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
