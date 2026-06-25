'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Scope = 'internal' | 'external';

type LpTarget = {
  id: string;
  scope: Scope;
  name: string;
  path: string;
  custom?: boolean;
};

const STORAGE_KEY = 'comiu:superadmin:lp-analytics-targets:v1';

const metricCards = [
  { title: 'アクセス', body: 'PV、UU、流入元を見る' },
  { title: 'クリック', body: 'CTA、LINE、問い合わせを見る' },
  { title: '読まれ方', body: 'スクロール率、滞在時間を見る' },
  { title: '成果', body: 'CV、改善メモを見る' },
];

const defaultTargets: LpTarget[] = [
  { id: 'home', scope: 'internal', name: 'トップページ', path: '/' },
  { id: 'organizers', scope: 'internal', name: '主催者向けページ', path: '/organizers' },
  { id: 'guide', scope: 'internal', name: '公式ガイド一覧', path: '/guide' },
  { id: 'pricing', scope: 'internal', name: '料金ページ', path: '/pricing' },
  { id: 'contact', scope: 'internal', name: 'お問い合わせページ', path: '/contact' },
  { id: 'register', scope: 'internal', name: '無料登録ページ', path: '/register' },
  { id: 'events-meetup', scope: 'internal', name: '交流会イベント一覧', path: '/events/meetup' },
  { id: 'sports-badminton', scope: 'internal', name: 'バドミントンイベント一覧', path: '/sports/badminton' },
  { id: 'sports-basketball', scope: 'internal', name: 'バスケイベント一覧', path: '/sports/basketball' },
  { id: 'sports-futsal', scope: 'internal', name: 'フットサルイベント一覧', path: '/sports/futsal' },
  { id: 'sports-volleyball', scope: 'internal', name: 'バレーイベント一覧', path: '/sports/volleyball' },
  { id: 'use-cases', scope: 'internal', name: '用途別ページ一覧', path: '/use-cases' },
  { id: 'use-cases-badminton', scope: 'internal', name: 'バドミントン主催者向け', path: '/use-cases/badminton-tokyo' },
  { id: 'use-cases-basketball', scope: 'internal', name: 'バスケ主催者向け', path: '/use-cases/basketball-tokyo' },
  { id: 'use-cases-futsal', scope: 'internal', name: 'フットサル主催者向け', path: '/use-cases/futsal-tokyo' },
  { id: 'use-cases-volleyball', scope: 'internal', name: 'バレー主催者向け', path: '/use-cases/volleyball-tokyo' },
  { id: 'guide-detail', scope: 'internal', name: '公式ガイド記事詳細', path: '/guide/...' },
  { id: 'external-production', scope: 'external', name: '外部制作LP', path: '公開URLを登録' },
  { id: 'external-ad', scope: 'external', name: '広告用WEBサイト', path: '公開URLを登録' },
  { id: 'external-test', scope: 'external', name: '検証用ページ', path: '公開URLを登録' },
];

function loadTargets(): LpTarget[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.id && item?.name && item?.path && (item?.scope === 'internal' || item?.scope === 'external'));
  } catch {
    return [];
  }
}

function saveTargets(targets: LpTarget[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
}

export default function LpAnalyticsClient() {
  const [scope, setScope] = useState<Scope>('internal');
  const [customTargets, setCustomTargets] = useState<LpTarget[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');

  useEffect(() => {
    setCustomTargets(loadTargets());
  }, []);

  const targets = useMemo(
    () => [...defaultTargets, ...customTargets].filter((target) => target.scope === scope),
    [customTargets, scope],
  );

  function resetForm() {
    setName('');
    setPath('');
  }

  function handleAddTarget(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPath = path.trim();
    if (!trimmedName || !trimmedPath) return;

    const next = [
      ...customTargets,
      {
        id: `lp-${Date.now()}`,
        scope,
        name: trimmedName,
        path: trimmedPath,
        custom: true,
      },
    ];
    setCustomTargets(next);
    saveTargets(next);
    resetForm();
    setShowAdd(false);
  }

  function handleRemoveTarget(id: string) {
    const next = customTargets.filter((target) => target.id !== id);
    setCustomTargets(next);
    saveTargets(next);
  }

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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900">分析するLP</h2>
                  {scope === 'internal' && (
                    <span className="rounded-full bg-[#06C755]/10 px-2 py-1 text-[11px] font-bold text-[#06C755]">自動投入済み</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {scope === 'internal' ? 'COMIU配下のページを計測対象にします。' : '外部で公開したLPを計測対象にします。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAdd(true);
                }}
                className="rounded-lg bg-[#06C755] px-3 py-2 text-xs font-bold text-white hover:bg-[#05a847]"
              >
                LP追加
              </button>
            </div>
            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {targets.map((target) => (
                <div key={target.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{target.name}</p>
                    <p className="mt-1 truncate text-xs text-gray-400">{target.path}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-400">未接続</span>
                    {target.custom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTarget(target.id)}
                        className="text-xs font-bold text-red-400 hover:text-red-500"
                      >
                        削除
                      </button>
                    )}
                  </div>
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowAdd(false)}>
          <form
            onSubmit={handleAddTarget}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">LPを追加</h2>
                <p className="mt-1 text-xs text-gray-500">{scope === 'internal' ? 'COMIU内のURLを登録します。' : '外部で公開したURLを登録します。'}</p>
              </div>
              <button type="button" onClick={() => setShowAdd(false)} className="text-sm font-bold text-gray-400 hover:text-gray-600">
                閉じる
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-gray-500">LP名</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#06C755] focus:ring-4 focus:ring-[#06C755]/10"
                  placeholder={scope === 'internal' ? '例：主催者向けページ' : '例：新歓募集LP'}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-gray-500">URL</span>
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  maxLength={240}
                  className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#06C755] focus:ring-4 focus:ring-[#06C755]/10"
                  placeholder={scope === 'internal' ? '/organizers' : 'https://example.com/lp'}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!name.trim() || !path.trim()}
              className="mt-5 w-full rounded-xl bg-[#06C755] py-3 text-sm font-bold text-white hover:bg-[#05a847] disabled:cursor-not-allowed disabled:opacity-40"
            >
              追加する
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
