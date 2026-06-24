'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Scope = 'internal' | 'external';

type LpPage = {
  id: string;
  scope: Scope;
  name: string;
  url: string;
  pv: number;
  uu: number;
  ctaClicks: number;
  lineClicks: number;
  messageClicks: number;
  conversions: number;
  avgScroll: number;
  avgTime: string;
  topSource: string;
  status: 'sample' | 'tracking' | 'paused';
};

const pages: LpPage[] = [
  {
    id: 'organizers',
    scope: 'internal',
    name: '主催者向けWEBサイト',
    url: '/organizers',
    pv: 1280,
    uu: 642,
    ctaClicks: 88,
    lineClicks: 34,
    messageClicks: 12,
    conversions: 18,
    avgScroll: 72,
    avgTime: '1:42',
    topSource: 'Google',
    status: 'sample',
  },
  {
    id: 'guide-line',
    scope: 'internal',
    name: '新歓集客ガイド',
    url: '/guide/circle-recruiting-line',
    pv: 740,
    uu: 398,
    ctaClicks: 41,
    lineClicks: 20,
    messageClicks: 6,
    conversions: 9,
    avgScroll: 64,
    avgTime: '1:18',
    topSource: 'Search',
    status: 'sample',
  },
  {
    id: 'gakuori-lp',
    scope: 'external',
    name: 'GAKUORI募集LP',
    url: 'https://example.com/gakuori',
    pv: 920,
    uu: 511,
    ctaClicks: 96,
    lineClicks: 59,
    messageClicks: 18,
    conversions: 24,
    avgScroll: 81,
    avgTime: '2:04',
    topSource: 'Instagram',
    status: 'sample',
  },
  {
    id: 'badminton-lp',
    scope: 'external',
    name: '初心者バドミントンLP',
    url: 'https://example.com/badminton',
    pv: 560,
    uu: 307,
    ctaClicks: 52,
    lineClicks: 31,
    messageClicks: 8,
    conversions: 11,
    avgScroll: 69,
    avgTime: '1:35',
    topSource: 'X',
    status: 'sample',
  },
];

const trend = [
  { day: '6/19', pv: 180, clicks: 18, cv: 4 },
  { day: '6/20', pv: 220, clicks: 24, cv: 5 },
  { day: '6/21', pv: 260, clicks: 31, cv: 6 },
  { day: '6/22', pv: 240, clicks: 28, cv: 5 },
  { day: '6/23', pv: 310, clicks: 38, cv: 9 },
  { day: '6/24', pv: 360, clicks: 44, cv: 11 },
  { day: '6/25', pv: 420, clicks: 51, cv: 12 },
];

const sources = [
  { name: 'Google', value: 42 },
  { name: 'Instagram', value: 26 },
  { name: 'Direct', value: 18 },
  { name: 'X', value: 9 },
  { name: 'Other', value: 5 },
];

const heatmap = [
  { section: 'ファーストビュー', view: 100, click: 64, risk: 'low' },
  { section: '悩み・共感', view: 86, click: 35, risk: 'mid' },
  { section: '解決策', view: 74, click: 42, risk: 'low' },
  { section: '事例・実績', view: 51, click: 18, risk: 'high' },
  { section: 'FAQ', view: 38, click: 12, risk: 'high' },
  { section: '最終CTA', view: 29, click: 22, risk: 'mid' },
];

function percent(value: number, base: number) {
  if (!base) return '0.0%';
  return `${((value / base) * 100).toFixed(1)}%`;
}

function statusLabel(status: LpPage['status']) {
  if (status === 'tracking') return '計測中';
  if (status === 'paused') return '停止中';
  return 'サンプル';
}

function statusClass(status: LpPage['status']) {
  if (status === 'tracking') return 'bg-[#06C755]/10 text-[#06C755]';
  if (status === 'paused') return 'bg-gray-100 text-gray-400';
  return 'bg-amber-50 text-amber-600';
}

function heatColor(value: number) {
  if (value >= 80) return 'bg-[#06C755] text-white';
  if (value >= 60) return 'bg-emerald-100 text-emerald-700';
  if (value >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold leading-none text-gray-950">{value}</p>
      {sub && <p className="mt-2 text-xs leading-relaxed text-gray-500">{sub}</p>}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-gray-700">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
};

export default function LpAnalyticsPage() {
  const [scope, setScope] = useState<Scope>('internal');
  const visiblePages = useMemo(() => pages.filter((page) => page.scope === scope), [scope]);
  const totals = useMemo(() => visiblePages.reduce(
    (acc, page) => ({
      pv: acc.pv + page.pv,
      uu: acc.uu + page.uu,
      clicks: acc.clicks + page.ctaClicks + page.lineClicks + page.messageClicks,
      cv: acc.cv + page.conversions,
      scroll: acc.scroll + page.avgScroll,
    }),
    { pv: 0, uu: 0, clicks: 0, cv: 0, scroll: 0 },
  ), [visiblePages]);
  const avgScroll = visiblePages.length ? Math.round(totals.scroll / visiblePages.length) : 0;

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/superadmin" className="text-sm font-bold text-gray-400 hover:text-gray-700">← 管理</Link>
          <div>
            <h1 className="text-lg font-bold">LP分析</h1>
            <p className="text-xs text-gray-500">COMIU内ページと外部LPのアクセス・クリック・CVを分けて見ます。</p>
          </div>
          <div className="ml-auto hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 sm:block">
            計測データ接続前
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">分析対象</p>
            <p className="mt-1 text-xs text-gray-500">外部で作ったLPも、公開後は同じ指標で評価できる前提の画面です。</p>
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
          <StatCard label="PV" value={totals.pv.toLocaleString()} sub="ページ表示数" />
          <StatCard label="UU" value={totals.uu.toLocaleString()} sub="重複を除いた閲覧者" />
          <StatCard label="クリック" value={totals.clicks.toLocaleString()} sub="CTA・LINE・問い合わせ" />
          <StatCard label="CV率" value={percent(totals.cv, totals.uu)} sub={`${totals.cv}件のCV`} />
          <StatCard label="平均スクロール" value={`${avgScroll}%`} sub="読まれた深さ" />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">7日間の動き</h2>
                <p className="mt-1 text-xs text-gray-500">PV、クリック、CVの伸び方を並べて見ます。</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="lpPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06C755" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#06C755" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lpClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="pv" name="PV" stroke="#06C755" strokeWidth={2} fill="url(#lpPv)" />
                <Area type="monotone" dataKey="clicks" name="クリック" stroke="#2563EB" strokeWidth={2} fill="url(#lpClicks)" />
                <Area type="monotone" dataKey="cv" name="CV" stroke="#F97316" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">流入元</h2>
            <p className="mt-1 text-xs text-gray-500">どこから来ているかをざっくり把握します。</p>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={235}>
                <BarChart data={sources} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="比率" fill="#06C755" radius={[0, 8, 8, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">ページ別パフォーマンス</h2>
              <p className="mt-1 text-xs text-gray-500">勝っているLP、改善するLPを一画面で見ます。</p>
            </div>
            <p className="text-xs font-bold text-gray-400">{scope === 'internal' ? 'COMIU内LP' : '外部LP'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-400">
                  <th className="py-3 pr-4">ページ</th>
                  <th className="px-3 py-3">PV</th>
                  <th className="px-3 py-3">UU</th>
                  <th className="px-3 py-3">CTA</th>
                  <th className="px-3 py-3">LINE</th>
                  <th className="px-3 py-3">問い合わせ</th>
                  <th className="px-3 py-3">CV率</th>
                  <th className="px-3 py-3">スクロール</th>
                  <th className="px-3 py-3">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiblePages.map((page) => (
                  <tr key={page.id} className="align-top">
                    <td className="py-4 pr-4">
                      <p className="font-bold text-gray-900">{page.name}</p>
                      <p className="mt-1 max-w-[260px] truncate text-xs text-gray-400">{page.url}</p>
                    </td>
                    <td className="px-3 py-4 font-bold text-gray-900">{page.pv.toLocaleString()}</td>
                    <td className="px-3 py-4 text-gray-600">{page.uu.toLocaleString()}</td>
                    <td className="px-3 py-4 text-gray-600">{page.ctaClicks}</td>
                    <td className="px-3 py-4 text-gray-600">{page.lineClicks}</td>
                    <td className="px-3 py-4 text-gray-600">{page.messageClicks}</td>
                    <td className="px-3 py-4 font-bold text-[#06C755]">{percent(page.conversions, page.uu)}</td>
                    <td className="px-3 py-4 text-gray-600">{page.avgScroll}%</td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusClass(page.status)}`}>
                        {statusLabel(page.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">スクロール・クリックの濃さ</h2>
            <p className="mt-1 text-xs text-gray-500">どのブロックで読まれ、どこでクリックされているかを見ます。</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {heatmap.map((item) => (
                <div key={item.section} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-bold text-gray-700">{item.section}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className={`rounded-lg px-2 py-2 text-center text-xs font-bold ${heatColor(item.view)}`}>
                      閲覧 {item.view}%
                    </div>
                    <div className={`rounded-lg px-2 py-2 text-center text-xs font-bold ${heatColor(item.click)}`}>
                      クリック {item.click}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">見るべき改善ポイント</h2>
            <div className="mt-4 space-y-3">
              {[
                ['ファーストビュー', 'CTAクリックは高いので、見出しとボタンの訴求は残す。'],
                ['事例・実績', '到達率が落ちやすいので、上部に短い実績カードを移動する。'],
                ['最終CTA', '到達率は低いがクリック率はあるため、中盤にも同じCTAを置く。'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
