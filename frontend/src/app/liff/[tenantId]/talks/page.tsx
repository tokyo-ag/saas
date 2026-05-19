'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, LiffConnection, LiffTenant } from '@/lib/api';
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

export default function TalksPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
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


      const [tenantResult, connectionsResult] = await Promise.allSettled([
        api.liff.tenant(tenantId),
        uid ? api.liff.connections(tenantId, uid) : Promise.resolve([]),
      ]);

      if (tenantResult.status === 'fulfilled') setTenant(tenantResult.value);
      if (connectionsResult.status === 'fulfilled') setConnections(connectionsResult.value);
      setLoading(false);
    }
    init();
  }, [tenantId]);

  const organizerName = tenant?.lineDisplayName ?? tenant?.name ?? '主催者';
  const organizerPicture = tenant?.linePictureUrl;

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between px-4 pt-12 pb-3">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Talk</h1>
            <Link
              href={`/liff/${tenantId}/qr`}
              className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full active:bg-white/30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                <path d="M14 14h3v3m0 4h4v-4m-7 4h3"/>
              </svg>
              友達追加QR
            </Link>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="space-y-2 mb-4">
            <button
              onClick={() => router.push(`/liff/${tenantId}/admin-talk`)}
              className="w-full bg-[[#06C755]/20] rounded-2xl border border-[[#06C755]/20] p-4 flex items-center gap-3 active:bg-[[#06C755]/10] text-left"
            >
              {organizerPicture ? (
                <img src={organizerPicture} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[[#06C755]/20] flex items-center justify-center text-sm font-bold text-[#06C755] shrink-0">
                  {organizerName.slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{organizerName}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">団体の主催者へ直接メッセージ</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>

            <button
              onClick={() => router.push(`/liff/${tenantId}/support`)}
              className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-3 active:bg-gray-100 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">?</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">COMIU サポートチャット</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">アプリの使い方や不具合などをCOMIUに相談</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          </div>

          {connections.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">メンバートーク</p>
          )}

          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">読み込み中...</p>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-8 text-center">
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                実際に会ってQRコードでつながった人と<br />メッセージできます
              </p>
              <button
                onClick={() => router.push(`/liff/${tenantId}/qr`)}
                className="bg-[#06C755] text-white text-sm font-semibold px-6 py-2.5 rounded-full active:bg-[#05a847]"
              >
                QRコードを開く
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => router.push(`/liff/${tenantId}/talks/${connection.id}`)}
                  className="w-full bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-[[#06C755]/10] flex items-center justify-center text-sm font-bold text-[#06C755] shrink-0">
                    {(connection.partner.name ?? '未').slice(0, 1)}
                  </div>
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
      </div>
      <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
