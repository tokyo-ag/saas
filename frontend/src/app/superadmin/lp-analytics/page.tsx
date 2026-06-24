'use client';

import { useState } from 'react';
import Link from 'next/link';

type Scope = 'internal' | 'external';

const metrics = [
  { label: 'PV', sub: 'ページ表示数' },
  { label: 'UU', sub: '重複を除いた閲覧者' },
  { label: 'クリック', sub: 'CTA・LINE・問い合わせ' },
  { label: 'CV率', sub: '成果につながった割合' },
  { label: '平均スクロール', sub: '読まれた深さ' },
];

const tableHeaders = ['ページ', 'PV', 'UU', 'CTA', 'LINE', '問い合わせ', 'CV率', 'スクロール', '流入元'];

const trackingTargets = [
  'ページ別アクセス',
  'CTAクリック',
  'LINE遷移',
  '問い合わせクリック',
  'スクロール到達率',
  '流入元',
  '滞在時間',
  'CV率',
];

function StatCard({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold leading-none text-gray-300">--</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{sub}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 text-center">
      <div>
        <p className="text-sm font-bold text-gray-700">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{body}</p>
      </div>
    </div>
  );
}

export default function LpAnalyticsPage() {
  const [scope, setScope] = useState<Scope>('internal');

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/superadmin" className="text-sm font-bold text-gray-400 hover:text-gray-700">← 管理</Link>
          <div>
            <h1 className="text-lg font-bold">LP分析</h1>
            <p className="text-xs text-gray-500">COMIU内ページと外部LPのアクセス・クリック・CVを分けて見ます。</p>
          </div>
          <div className="ml-auto hidden rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-500 sm:block">
            未計測
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">分析対象</p>
            <p className="mt-1 text-xs text-gray-500">COMIU配下のページと、外部で作ったLPを分けて管理します。</p>
          </div>
          <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
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
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => (
            <StatCard key={metric.label} label={metric.label} sub={metric.sub} />
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-gray-900">アクセス推移</h2>
              <p className="mt-1 text-xs text-gray-500">PV、クリック、CVの推移を表示します。</p>
            </div>
            <EmptyPanel title="まだ計測データがありません" body="計測が始まると、日別のアクセス推移がここに表示されます。" />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">流入元</h2>
            <p className="mt-1 text-xs text-gray-500">検索、SNS、直接流入などの割合を表示します。</p>
            <div className="mt-4">
              <EmptyPanel title="まだ流入データがありません" body="流入元が取得できると、媒体ごとの比率がここに表示されます。" />
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">ページ別パフォーマンス</h2>
              <p className="mt-1 text-xs text-gray-500">公開したLPごとの成果を一覧で確認します。</p>
            </div>
            <p className="text-xs font-bold text-gray-400">{scope === 'internal' ? 'COMIU内LP' : '外部LP'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-400">
                  {tableHeaders.map((header) => (
                    <th key={header} className="px-3 py-3 first:pl-0">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={tableHeaders.length} className="py-10 text-center text-sm text-gray-400">
                    まだページ別データがありません
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">スクロール・クリック</h2>
            <p className="mt-1 text-xs text-gray-500">LP内のどこまで読まれ、どこが押されたかを表示します。</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {trackingTargets.slice(0, 8).map((item) => (
                <div key={item} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center text-xs font-bold text-gray-500">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">改善メモ</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              計測後に、数字を見ながら改善点を残せる場所にします。今はまだメモはありません。
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
              改善メモはまだありません
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
