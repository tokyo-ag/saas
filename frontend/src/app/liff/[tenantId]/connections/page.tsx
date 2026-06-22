'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, LiffConnection } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

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
        const loggedIn = await loginIfNeeded();
        if (loggedIn) uid = (await getLiffUserId()) ?? '';
      } else {
        uid = `demo-${tenantId}`;
      }

      if (!uid) {
        setLoading(false);
        return;
      }

      api.liff.connections(tenantId, uid)
        .then(setConnections)
        .catch(() => setConnections([]))
        .finally(() => setLoading(false));
    }
    init();
  }, [tenantId]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <h1 className="text-lg font-bold">つながり</h1>
        <p className="text-white/70 text-xs mt-0.5">参加後に連絡できる相手が表示されます</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">読み込み中...</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">💬</div>
            <p className="text-gray-500 text-sm leading-relaxed">
              まだつながりはありません。
            </p>
            <button
              onClick={() => router.push(`/liff/${tenantId}/talks`)}
              className="bg-[#06C755] text-white px-6 py-3 rounded-xl text-sm font-medium active:bg-[#05a847]"
            >
              連絡へ戻る
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((connection) => (
              <button
                key={connection.id}
                onClick={() => router.push(`/liff/${tenantId}/connections/${connection.id}`)}
                className="w-full bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#06C755]/10 flex items-center justify-center text-xl shrink-0">💬</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{connection.partner.name ?? '未登録'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {connection.lastMessage ? connection.lastMessage.content : 'メッセージを送ってみよう'}
                  </p>
                </div>
                {connection.lastMessage && (
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(connection.lastMessage.createdAt)}</span>
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
