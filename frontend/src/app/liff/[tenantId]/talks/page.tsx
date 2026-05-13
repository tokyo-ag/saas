'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, LiffConnection } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

export default function TalksPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [connections, setConnections] = useState<LiffConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        await loginIfNeeded();
        uid = (await getLiffUserId()) ?? '';
      } else {
        uid = `demo-${tenantId}`;
      }
      if (uid) {
        api.liff.connections(tenantId, uid)
          .then(setConnections)
          .catch(() => setConnections([]))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
    init();
  }, [tenantId]);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'たった今';
    if (m < 60) return `${m}分前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}時間前`;
    return `${Math.floor(h / 24)}日前`;
  }

  return (
    <>
    <div className="min-h-screen bg-[#F5F5F5] pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Talk</h1>
          <Link
            href={`/liff/${tenantId}/qr`}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <span className="text-[11px] font-bold text-gray-500">QR</span>
          </Link>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* 固定エントリ: 主催者トーク + サポート */}
        <div className="space-y-2 mb-4">
          <button
            onClick={() => router.push(`/liff/${tenantId}/admin-talk`)}
            className="w-full bg-[#06C755]/5 rounded-2xl border border-[#06C755]/20 p-4 flex items-center gap-3 active:bg-[#06C755]/10 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-[#06C755]/15 flex items-center justify-center text-xl shrink-0">🏠</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">主催者</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">主催者へのメッセージ・お問い合わせ</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </button>
          <button
            onClick={() => router.push(`/liff/${tenantId}/support`)}
            className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-3 active:bg-gray-100 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl shrink-0">🛟</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">サポート</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">アプリの使い方・ご要望など</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        </div>

        {/* メンバー間トーク */}
        {connections.length > 0 && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">メンバートーク</p>
        )}
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">読み込み中...</p>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-8 text-center">
            <p className="text-gray-400 text-xs leading-relaxed mb-4">実際に会ってQRコードで繋がった人と<br />メッセージできます</p>
            <button
              onClick={() => router.push(`/liff/${tenantId}/qr`)}
              className="bg-[#06C755] text-white text-sm font-semibold px-6 py-2.5 rounded-full active:bg-[#05a847]"
            >
              QRコードを開く
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/liff/${tenantId}/talks/${c.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#06C755]/10 flex items-center justify-center text-xl shrink-0">👤</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{c.partner.name ?? '（名前未登録）'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {c.lastMessage ? c.lastMessage.content : 'メッセージを送ってみよう'}
                  </p>
                </div>
                {c.lastMessage && (
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.lastMessage.createdAt)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
    <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
