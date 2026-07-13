'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, LiffConnection, LiffTenant } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';
import { useLiffTheme } from '@/components/liff/LiffThemeProvider';

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
  const theme = useLiffTheme();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
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
  const organizerPicture = tenant?.linePictureUrl ?? tenant?.iconUrl;
  const officialLineChatUrl = tenant?.contactUrl?.trim() || null;

  return (
    <>
      <div className="min-h-screen pb-24" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="sticky top-0 z-10 border-b border-gray-100" style={{ backgroundColor: theme.navBg }}>
          <div className="px-4 pt-12 pb-3">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">連絡</h1>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="space-y-2 mb-4">
            {officialLineChatUrl && (
              <a
                href={officialLineChatUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-2xl border p-4 flex items-center gap-3 text-left active:opacity-80"
                style={{ backgroundColor: `${theme.accentColor}18`, borderColor: `${theme.accentColor}30` }}
              >
                {organizerPicture ? (
                  <Image src={organizerPicture} width={48} height={48} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" unoptimized />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: `${theme.accentColor}30`, color: theme.accentColor }}>
                    {organizerName.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{organizerName}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">公式LINEで団体・主催者へ連絡</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </a>
            )}

            <button
              onClick={() => router.push(`/liff/${tenantId}/support`)}
              className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-3 active:bg-gray-100 text-left"
            >
              <Image src="/icon.png" width={48} height={48} className="w-12 h-12 rounded-full object-cover shrink-0" alt="COMIU" unoptimized />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">COMIU サポート</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">アプリの使い方や不具合を相談</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          </div>

          {connections.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">メンバー</p>
          )}

          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">読み込み中...</p>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-8 text-center">
              <p className="text-gray-400 text-xs leading-relaxed">
                連絡が必要なときは、上のカードから主催者またはCOMIUに送れます。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => router.push(`/liff/${tenantId}/talks/${connection.id}`)}
                  className="w-full bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 text-left"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: `${theme.accentColor}18`, color: theme.accentColor }}>
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
