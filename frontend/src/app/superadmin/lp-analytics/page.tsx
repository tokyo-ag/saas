'use client';

import { useState } from 'react';
import Link from 'next/link';

type Scope = 'internal' | 'external';

export default function LpAnalyticsPage() {
  const [scope, setScope] = useState<Scope>('internal');

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

      <div className="mx-auto max-w-6xl px-4 py-5">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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

          <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 text-center">
            <div>
              <p className="text-base font-bold text-gray-800">まだ計測データはありません</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {scope === 'internal'
                  ? 'COMIU内LPの計測を接続すると、ここに実データが表示されます。'
                  : '外部LPの計測を接続すると、ここに実データが表示されます。'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
