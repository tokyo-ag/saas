'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, LiffTenant, setLiffToken } from '@/lib/api';
import { initLiff, isLiffLoggedIn, liff, loginIfNeeded } from '@/lib/liff';

export default function LineNotificationsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [linked, setLinked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    const status = await api.liff.lineNotificationLink(tenantId);
    setAvailable(status.available);
    setLinked(status.linked);
    if (status.linked) setCode(null);
  }

  useEffect(() => {
    async function load() {
      try {
        const ok = await initLiff();
        if (!ok || !isLiffLoggedIn()) {
          await loginIfNeeded();
          return;
        }
        setLiffToken(liff.getIDToken());
        const tenantInfo = await api.liff.tenant(tenantId);
        setTenant(tenantInfo);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  async function issueCode() {
    setError('');
    try {
      const result = await api.liff.createLineNotificationLinkCode(tenantId);
      setLinked(result.linked);
      setCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携コードを発行できませんでした');
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>;

  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-gray-50 px-4 py-6">
      <Link href={`/liff/${tenantId}/profile`} className="text-sm text-gray-500">← マイページへ戻る</Link>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">LINE通知の連携</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {tenant?.name ?? '団体'}の公式LINEから、予約完了やリマインドを受け取るための設定です。
        </p>

        {!available ? (
          <p className="mt-5 rounded-xl bg-gray-100 p-4 text-sm text-gray-600">この団体ではLINE通知を利用できません。</p>
        ) : linked ? (
          <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
            連携済みです。LINE通知を受け取れます。
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-700">
              <li>下のボタンから団体公式LINEを友だち追加します。</li>
              <li>連携コードを発行します。</li>
              <li>表示された「連携 XXXXXXXX」を公式LINEのトークへ送信します。</li>
            </ol>
            {tenant?.contactUrl && (
              <a href={tenant.contactUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-[#06C755] px-4 py-3 text-center text-sm font-bold text-white">
                団体公式LINEを友だち追加
              </a>
            )}
            <button onClick={issueCode} className="w-full rounded-xl border border-[#06C755] px-4 py-3 text-sm font-bold text-[#06C755]">
              {code ? '連携コードを再発行' : '連携コードを発行'}
            </button>
            {code && (
              <div className="rounded-xl bg-gray-900 p-5 text-center text-white">
                <p className="text-xs text-gray-300">このまま公式LINEへ送信してください（15分間有効）</p>
                <p className="mt-2 select-all font-mono text-2xl font-bold tracking-wider">連携 {code}</p>
              </div>
            )}
            <button onClick={refresh} className="w-full py-2 text-sm text-gray-500 underline">送信後、連携状態を確認</button>
          </div>
        )}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </main>
  );
}
