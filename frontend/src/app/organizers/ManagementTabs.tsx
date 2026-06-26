'use client';

import { useState } from 'react';


const tabs = [
  {
    label: '💬 LINEリマインド',
    dot: 'bg-emerald-400',
    title: '公式LINEによるドタキャン防止の「自動リマインド」',
    body: (
      <>
        イベント直前のリマインドメッセージを使い慣れた公式LINEへ自動配信。連絡漏れによる不参加や直前キャンセルを劇的に減らします。配信時間や文章は自由にカスタマイズ可能です。
        <br /><br />
        Lステップのような複雑なAPI連携やDB管理は不要で、誰でも簡単に連携可能。オンラインでの導入案内サポートもご用意しています。
      </>
    ),
  },
  {
    label: '📅 簡単予約',
    dot: 'bg-emerald-400',
    title: '目的に合わせて選べるカレンダーからボタン一つで簡単予約',
    body: (
      <>
        団体の特性に合わせて最適な表示に切り替えられるカレンダーUIを採用。
        <br /><br />
        公式LINEのチャット画面やリッチメニューに予約URLリンクを直接埋め込むことで、ユーザーを迷わせない「直感的かつワンタップで完了する予約導線」を構築できます。
      </>
    ),
  },
  {
    label: '👥 ユーザー管理',
    dot: 'bg-pink-400',
    title: 'Googleフォームやスプレッドシートいらずのユーザー管理',
    body: (
      <>
        予約データと顧客情報が自動でシステム内に紐づくため、手動の名簿突合業務はもう不要です。
        <br /><br />
        無断キャンセルや悪質なユーザーにはブロック機能や警告ラベルで対策。COMIUプラットフォーム全体で健全なコミュニティ環境を担保します。
      </>
    ),
  },
  {
    label: '💳 決済連携',
    dot: 'bg-pink-400',
    title: '専門業者との安心連携による安全なオンライン決済管理',
    body: '面倒な参加費の集金や未入金トラブルを未然に防ぐため、強固なセキュリティを持つ決済システムと標準連携。安全かつスマートなお金の管理を実現します。',
  },
];

export default function ManagementTabs() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <>
      {/* タブナビ */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-800/60 pb-4 scrollbar-none snap-x snap-mandatory">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`snap-center shrink-0 rounded-xl border px-5 py-2.5 text-xs font-medium transition-all duration-200 ${
              i === active
                ? 'border-white/20 bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                : 'border-slate-800 bg-slate-900/50 text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="min-h-[240px] rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 shadow-2xl lg:p-8">
        <div className={`flex gap-8 ${active === 0 || active === 1 ? 'flex-col lg:flex-row lg:items-center' : ''}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />
              <h3 className="text-base font-bold tracking-wide text-white">{tab.title}</h3>
            </div>
            <p className="text-xs font-light leading-relaxed text-slate-400">{tab.body}</p>
          </div>
          {active === 0 && (
            <div className="shrink-0 lg:w-64 xl:w-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/comiu-line-reminder.svg" alt="LINE自動リマインド" className="w-full rounded-xl" />
            </div>
          )}
          {active === 1 && (
            <div className="shrink-0 lg:w-80 xl:w-96">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { src: '/shuttles-calendar.svg', label: 'カレンダー' },
                  { src: '/shuttles-event-cards.svg', label: 'カード' },
                  { src: '/shuttles-schedule-cards.svg', label: 'スレッド' },
                ].map(({ src, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={label} className="h-56 w-auto rounded-lg object-contain lg:h-64" />
                    <span className="text-[10px] font-medium text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
