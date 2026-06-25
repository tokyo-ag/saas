'use client';

import { useState } from 'react';
import Link from 'next/link';

type Scope = 'internal' | 'external';

const metricCards = [
  { title: 'アクセス', body: 'PV、UU、流入元を見る' },
  { title: 'クリック', body: 'CTA、LINE、問い合わせを見る' },
  { title: '読まれ方', body: 'スクロール率、滞在時間を見る' },
  { title: '成果', body: 'CV、改善メモを見る' },
];

const internalTargets = [
  { name: '主催者向けページ', path: '/organizers' },
  { name: '公式ガイド記事', path: '/guide/...' },
  { name: '用途別ページ', path: '/use-cases/...' },
];

const externalTargets = [
  { name: '外部制作LP', path: '公開URLを登録' },
  { name: '広告用WEBサイト', path: '公開URLを登録' },
  { name: '検証用ページ', path: '公開URLを登録' },
];

export default function LpAnalyticsClient() {
  const [scope, setScope] = useState<Scope>('internal');
  const targets = scope === 'internal' ? internalTargets : externalTargets;

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/superadmin" className="text-sm font-bold text-gray-400 hover:text-gray-700">← 管理</Link>
          <div>
            <h1 className="text-lg font-bold">LP分析</h1>
            <p className="text-xs text-gray-500">公開したLPの効果を確認する場所です。</p>
          </div>
          <div className="ml-auto hidden rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-500 sm:block">
            未計測
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-fit">
              {[
                { value: 'internal' as const, label: 'COMIU内LP' },
                { value: 'external' as const, label: '外部LP' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setScope(item.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${scope === item.value ? 'bg-[#06C755] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              実データを接続するまで、数値は表示しません。
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-900">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{item.body}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">分析するLP</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {scope === 'internal' ? 'COMIU配下のページを計測対象にします。' : '外部で公開したLPを計測対象にします。'}
                </p>
              </div>
              <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500">
                追加予定
              </button>
            </div>
            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {targets.map((target) => (
                <div key={target.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{target.name}</p>
                    <p className="mt-1 text-xs text-gray-400">{target.path}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-400">未接続</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">計測をつなぐ流れ</h2>
            <div className="mt-4 space-y-3">
              {[
                'LPを公開する',
                '計測対象として登録する',
                'クリックとスクロールを記録する',
                '数字を見て改善メモを残す',
              ].map((text, index) => (
                <div key={text} className="flex gap-3 rounded-xl bg-gray-50 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-xs font-bold text-white">{index + 1}</span>
                  <p className="text-sm font-bold text-gray-700">{text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
