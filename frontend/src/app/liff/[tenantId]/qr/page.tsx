'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import jsQR from 'jsqr';
import { api, LiffProfile } from '@/lib/api';
import { initLiff, getLiffProfile, loginIfNeeded } from '@/lib/liff';

export default function QrPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      let lineDisplayName: string | undefined;
      let linePictureUrl: string | undefined;
      if (ok) {
        await loginIfNeeded();
        const liffProfile = await getLiffProfile();
        uid = liffProfile?.userId ?? '';
        lineDisplayName = liffProfile?.displayName;
        linePictureUrl = liffProfile?.pictureUrl;
      } else {
        uid = `demo-${tenantId}`;
      }
      setLineUserId(uid);
      if (uid) {
        api.liff.join(tenantId, { lineDisplayName, linePictureUrl })
          .then(setProfile)
          .catch(() => setProfile(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
    init();
    return () => stopCamera();
  }, [tenantId]);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function handleScan() {
    setError('');
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      tick();
    } catch {
      setError('カメラの起動に失敗しました。カメラの許可を確認してください。');
      setScanning(false);
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        stopCamera();
        setScanning(false);
        router.push(`/liff/${tenantId}/connect/${code.data}`);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleCancelScan() {
    stopCamera();
    setScanning(false);
    setError('');
  }

  async function handleToggleShowEvents() {
    if (!profile || !lineUserId || toggling) return;
    setToggling(true);
    try {
      const next = !profile.showEventsToConnections;
      const result = await api.liff.updateSettings(tenantId, lineUserId, { showEventsToConnections: next });
      setProfile({ ...profile, showEventsToConnections: result.showEventsToConnections });
    } catch {
      // 無視
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => { if (scanning) handleCancelScan(); else router.push(`/liff/${tenantId}`); }} className="text-gray-600 p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[17px] font-bold text-gray-900">QRコード</h1>
      </div>

      {/* カメラスキャン画面 */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 pt-12 pb-3">
            <button onClick={handleCancelScan} className="text-white text-sm font-medium">キャンセル</button>
            <p className="text-white text-sm font-medium">QRコードをスキャン</p>
            <div className="w-16" />
          </div>
          <div className="flex-1 relative flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {/* スキャン枠 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#06C755] rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#06C755] rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#06C755] rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#06C755] rounded-br-sm" />
              </div>
            </div>
          </div>
          <p className="text-white/70 text-xs text-center pb-12">相手のQRコードを枠に合わせてください</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-[#06C755] text-sm">読み込み中...</div>
      )}
      {!loading && (
        <div className="px-4 py-6 space-y-5">
          <div className="bg-[#06C755]/8 rounded-2xl px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-[#05a847]">友達追加の使い方</p>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p>① 相手に自分のQRコードを見せる</p>
              <p>② または相手のQRをスキャンする</p>
              <p>③ つながるとトークができるようになります</p>
            </div>
          </div>

          <button
            onClick={handleScan}
            disabled={!profile}
            className="w-full bg-[#06C755] text-white py-5 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] shadow-sm flex items-center justify-center gap-3"
          >
            <span className="text-2xl">📷</span>
            相手のQRをスキャン
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {profile ? (
            <>
              <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">
                <p className="text-sm font-medium text-gray-700">自分のQRコード</p>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <QRCode value={profile.id} size={200} />
                </div>
                <p className="text-xs text-gray-400 text-center">相手にスキャンしてもらおう</p>
              </div>

              <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">参加予定イベントを友達に表示</p>
                  <p className="text-xs text-gray-400 mt-0.5">オンにすると友達のイベント一覧にあなたの参加情報が表示されます</p>
                </div>
                <button
                  onClick={handleToggleShowEvents}
                  disabled={toggling}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    profile.showEventsToConnections ? 'bg-[#06C755]' : 'bg-gray-300'
                  } disabled:opacity-60`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                    profile.showEventsToConnections ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm text-center">
              イベントに予約するとQRコードが作成されます
            </div>
          )}
        </div>
      )}
    </div>
  );
}
