'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, formatDate, API_URL } from '@/lib/api';

type CheckinReservation = {
  id: string;
  status: string;
  reservedAt: string;
  member: { id: string; name?: string | null; grade?: string | null; gender?: string | null };
};

type ScanResult = { memberName: string; alreadyCheckedIn: boolean } | null;


export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [reservations, setReservations] = useState<CheckinReservation[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'attended'>('all');
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'qr-reader';
  const lastScannedRef = useRef('');

  async function loadReservations() {
    const data = await api.events.reservations(eventId) as CheckinReservation[];
    setReservations(data);
  }

  useEffect(() => {
    loadReservations().catch(console.error);
  }, [eventId]);

  async function startScanner() {
    if (scannerRef.current) return;
    setScanning(true);
    const { Html5Qrcode } = await import('html5-qrcode');
    const qr = new Html5Qrcode(scannerContainerId);
    scannerRef.current = qr;
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (decodedText === lastScannedRef.current || processing) return;
          lastScannedRef.current = decodedText;
          setProcessing(true);
          try {
            const result = await api.events.checkin(eventId, decodedText);
            setScanResult(result);
            await loadReservations();
            setTimeout(() => {
              setScanResult(null);
              lastScannedRef.current = '';
            }, 3000);
          } catch {
            setScanResult(null);
            lastScannedRef.current = '';
          } finally {
            setProcessing(false);
          }
        },
        () => {},
      );
    } catch {
      setScanning(false);
      scannerRef.current = null;
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
    setScanResult(null);
    lastScannedRef.current = '';
  }

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  const attended = reservations.filter(r => r.status === 'attended').length;
  const total = reservations.filter(r => ['reserved', 'attended', 'waiting_payment'].includes(r.status)).length;

  const filtered = reservations.filter(r => {
    if (filter === 'pending') return ['reserved', 'waiting_payment'].includes(r.status);
    if (filter === 'attended') return r.status === 'attended';
    return ['reserved', 'attended', 'waiting_payment', 'waitlisted'].includes(r.status);
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => { stopScanner(); router.back(); }} className="text-gray-400 p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">受付モード</p>
          <p className="text-xs text-gray-400">{attended} / {total} 人 来場確認済み</p>
        </div>
        <div className="w-8" />
      </div>

      {/* QRスキャナー */}
      <div className="px-4 py-4">
        {!scanning ? (
          <button
            onClick={startScanner}
            className="w-full bg-[#06C755] py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:bg-[#05a847]"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V6a2 2 0 012-2h3M3 15v3a2 2 0 002 2h3m10-14h3a2 2 0 012 2v3M17 21h3a2 2 0 002-2v-3" />
            </svg>
            QRスキャンを開始
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <div id={scannerContainerId} className="w-full" />
              {/* 来場確認オーバーレイ */}
              {scanResult && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center ${scanResult.alreadyCheckedIn ? 'bg-yellow-500/95' : 'bg-[#06C755]/95'}`}>
                  <p className="text-5xl mb-3">{scanResult.alreadyCheckedIn ? '⚠️' : '✅'}</p>
                  <p className="text-xl font-bold text-white">{scanResult.memberName} さん</p>
                  <p className="text-base text-white mt-1">
                    {scanResult.alreadyCheckedIn ? '既にチェックイン済みです' : '来場確認！'}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={stopScanner}
              className="w-full border border-gray-700 py-3 rounded-xl text-sm text-gray-400"
            >
              スキャンを停止
            </button>
          </div>
        )}
      </div>

      {/* 参加者リスト */}
      <div className="px-4 pb-8">
        <div className="flex gap-2 mb-3">
          {(['all', 'pending', 'attended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {f === 'all' ? `全員 (${total})` : f === 'pending' ? `未着 (${total - attended})` : `来場済 (${attended})`}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                r.status === 'attended' ? 'bg-[#06C755]/15 border border-[#06C755]/30' : 'bg-gray-800'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                r.status === 'attended' ? 'bg-[#06C755] text-white' : 'bg-gray-700 text-gray-300'
              }`}>
                {r.status === 'attended' ? '✓' : (r.member.name ?? '?').slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.member.name ?? '未入力'}</p>
                <p className="text-xs text-gray-400">{r.member.grade ?? '-'} ・ {r.member.gender ?? '-'}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                r.status === 'attended' ? 'bg-[#06C755]/20 text-[#06C755]' :
                r.status === 'waitlisted' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-700 text-gray-300'
              }`}>
                {r.status === 'attended' ? '来場済' : r.status === 'waitlisted' ? '待機' : '未着'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
