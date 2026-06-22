'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, LiffProfile } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';

export default function ConnectPage() {
  const { tenantId, memberId } = useParams<{ tenantId: string; memberId: string }>();
  const router = useRouter();
  const [target, setTarget] = useState<LiffProfile | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        const loggedIn = await loginIfNeeded();
        if (loggedIn) {
          uid = (await getLiffUserId()) ?? '';
        }
      } else {
        uid = `demo-${tenantId}`;
      }
      setLineUserId(uid);
      api.liff.memberProfile(tenantId, memberId)
        .then(setTarget)
        .catch(() => setError('相手のプロフィールが見つかりません'))
        .finally(() => setLoading(false));
    }
    init();
  }, [tenantId, memberId]);

  async function handleConnect() {
    if (!lineUserId) return;
    setConnecting(true);
    setError('');
    try {
      const result = await api.liff.createConnection(tenantId, lineUserId, memberId);
      setConnectionId(result.id);
      setAlreadyConnected(result.alreadyConnected);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '繋がりを作れませんでした');
    } finally {
      setConnecting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#06C755] text-sm">読み込み中...</div>;

  if (done) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#06C755]/10 flex items-center justify-center text-4xl mb-5">
          {alreadyConnected ? '👋' : '🎉'}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {alreadyConnected ? 'すでに繋がっています' : `${target?.name ?? '相手'}さんと繋がりました！`}
        </h1>
        <p className="text-sm text-gray-500 mb-8">メッセージを送ってみよう</p>
        <button
          onClick={() => router.push(`/liff/${tenantId}/talks/${connectionId}`)}
          className="w-full max-w-sm bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base active:bg-[#05a847] shadow-sm"
        >
          チャットを開く
        </button>
        <button
          onClick={() => router.push(`/liff/${tenantId}/talks`)}
          className="w-full max-w-sm mt-3 border border-gray-200 text-gray-600 py-3.5 rounded-2xl text-sm"
        >
          トーク一覧へ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/liff/${tenantId}/talks`)} className="text-white text-xl leading-none p-1">‹</button>
        <h1 className="text-base font-bold">繋がりの確認</h1>
      </div>

      <div className="px-4 py-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#06C755]/10 flex items-center justify-center text-4xl mb-5">👤</div>

        {target ? (
          <>
            <p className="text-xl font-bold text-gray-900">{target.name ?? '（名前未登録）'}</p>
            <p className="text-sm text-gray-500 mt-1">{[target.grade, target.gender].filter(Boolean).join(' · ')}</p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">{error || 'プロフィールを読み込み中...'}</p>
        )}

        {error && !target && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm w-full max-w-sm">{error}</div>
        )}

        {target && (
          <div className="mt-8 w-full max-w-sm space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}
            <button
              onClick={handleConnect}
              disabled={connecting || !lineUserId}
              className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] shadow-sm"
            >
              {connecting ? '繋がり中...' : `${target.name ?? 'この人'}と繋がる`}
            </button>
            <button
              onClick={() => router.push(`/liff/${tenantId}/talks`)}
              className="w-full border border-gray-200 text-gray-500 py-3.5 rounded-2xl text-sm"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
