'use client';

import { useEffect, useState } from 'react';
import { api, PaymentLink, ComiuPayment } from '@/lib/api';

function formatAmount(yen: number) {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 active:bg-gray-300"
    >
      {copied ? 'コピー済み' : 'URLコピー'}
    </button>
  );
}

export default function ComiuPayPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [payments, setPayments] = useState<ComiuPayment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.comiuPay.listLinks(),
      api.comiuPay.listPayments(),
    ]).then(([linksData, paymentsData]) => {
      setLinks(linksData);
      setPayments(paymentsData.payments);
      setTotalRevenue(paymentsData.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!label.trim() || !amount || Number(amount) < 1) {
      setCreateError('ラベルと金額（1円以上）を入力してください');
      return;
    }
    setCreating(true);
    try {
      const link = await api.comiuPay.createLink({ label: label.trim(), amount: Number(amount) });
      setLinks((prev) => [link, ...prev]);
      setLabel('');
      setAmount('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(linkId: string) {
    if (!confirm('このリンクを無効化しますか？')) return;
    try {
      const updated = await api.comiuPay.deactivateLink(linkId);
      setLinks((prev) => prev.map((l) => l.id === linkId ? updated : l));
    } catch {
      alert('無効化に失敗しました');
    }
  }

  const activeLinks = links.filter((l) => l.active);
  const inactiveLinks = links.filter((l) => !l.active);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755] text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">COMIU PAY</h1>
          <p className="text-xs text-gray-500">決済リンク発行・売上管理</p>
        </div>
      </div>

      {/* 売上サマリー */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">決済リンク（有効）</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeLinks.length}件</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">直近50件の売上合計</p>
          <p className="mt-1 text-2xl font-bold text-[#06C755]">{formatAmount(totalRevenue)}</p>
        </div>
      </div>

      {/* リンク作成フォーム */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">決済リンクを発行する</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">ラベル（例：12/15バスケ参加費）</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              placeholder="支払い用途を入力"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">金額（円）</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">¥</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1}
                step={100}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                placeholder="1500"
              />
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="flex h-10 w-full items-center justify-center rounded-full bg-[#06C755] text-sm font-bold text-white disabled:opacity-50"
          >
            {creating ? '作成中...' : 'リンクを発行する'}
          </button>
        </form>
      </section>

      {/* 有効なリンク一覧 */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-gray-700">有効なリンク</h2>
        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : activeLinks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            まだリンクがありません
          </p>
        ) : (
          <div className="space-y-2">
            {activeLinks.map((link) => (
              <div key={link.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{link.label}</p>
                    <p className="text-xs text-[#06C755] font-bold">{formatAmount(link.amount)}</p>
                    <p className="mt-1 truncate text-[11px] text-gray-400">{link.url}</p>
                    <p className="text-[11px] text-gray-300">{formatDate(link.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <CopyButton text={link.url} />
                    <button
                      onClick={() => handleDeactivate(link.id)}
                      className="text-[11px] text-gray-400 hover:text-red-500"
                    >
                      無効化
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 決済履歴 */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-gray-700">直近の決済履歴</h2>
        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            決済履歴がありません
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {payments.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-800">{p.description || '—'}</p>
                  <p className="text-[11px] text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{formatAmount(p.amount)}</span>
                  {p.receiptUrl && (
                    <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600 underline">
                      領収書
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 無効なリンク（折りたたみ） */}
      {inactiveLinks.length > 0 && (
        <details className="rounded-xl border border-gray-100 bg-gray-50">
          <summary className="cursor-pointer px-4 py-3 text-xs text-gray-400 hover:text-gray-600">
            無効化済みリンク（{inactiveLinks.length}件）
          </summary>
          <div className="space-y-2 p-3 pt-0">
            {inactiveLinks.map((link) => (
              <div key={link.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 opacity-50">
                <p className="text-sm font-semibold text-gray-700 line-through">{link.label}</p>
                <p className="text-xs text-gray-400">{formatAmount(link.amount)} · {formatDate(link.createdAt)}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
