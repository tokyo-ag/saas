'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, LiffConnection } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

export default function ConnectionsPage() {
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
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <h1 className="text-lg font-bold">繋がり</h1>
        <p className="text-white/70 text-xs mt-0.5">交流会で出会った人とチャット</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">読み込み中...</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">👥</div>
            <p className="text-gray-500 text-sm leading-relaxed">
              まだ繋がりがありません<br />
              プロフィールのQRコードをスキャンして繋がろう
            </p>
            <button
              onClick={() => router.push(`/liff/${tenantId}/profile`)}
              className="bg-[#06C755] text-white px-6 py-3 rounded-xl text-sm font-medium active:bg-[#05a847]"
            >
              QRコードを開く
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/liff/${tenantId}/connections/${c.id}`)}
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

      <LiffBottomNav tenantId={tenantId} />
    </div>
  );
}
