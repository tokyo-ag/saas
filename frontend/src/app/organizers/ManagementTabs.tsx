'use client';

import { useState } from 'react';


const tabs = [
  {
    label: '公式LINE API',
    dot: 'bg-emerald-400',
    title: '公式LINE API連携で、予約後の連絡を自動化',
    body: (
      <>
        予約確認、前日リマインド、問い合わせ対応を公式LINEにつなげます。参加者は普段使うLINEで案内を受け取れるので、連絡漏れや直前キャンセルを減らしやすくなります。
        <br /><br />
        APIやデータベース管理を主催者が直接扱う必要はありません。サークル運営に必要な連絡導線として、自然に使える形で組み込みます。
      </>
    ),
  },
  {
    label: 'ワンタップ予約',
    dot: 'bg-emerald-400',
    title: '3タイプの予約画面から、活動に合う見せ方を選べる',
    body: (
      <>
        日程カレンダー、カード、スレッドの3タイプから選択。定期活動、新歓、体験会、交流会など、募集内容に合わせて予約導線を変えられます。
        <br /><br />
        公開ページや公式LINEのリッチメニューから予約URLへ誘導すれば、参加者は迷わず日程を選んで予約できます。
      </>
    ),
  },
  {
    label: '参加者管理',
    dot: 'bg-pink-400',
    title: '予約データと参加者情報をひとつにまとめる',
    body: (
      <>
        Googleフォーム、DM、スプレッドシートに分散しがちな予約情報をCOMIUに集約。誰が、どのイベントに、いつ予約したかを管理しやすくします。
        <br /><br />
        参加履歴や問い合わせも運営の文脈に残せるため、新歓期や定期イベントでも対応がぶれにくくなります。
      </>
    ),
  },
  {
    label: '決済連携',
    dot: 'bg-pink-400',
    title: '必要に応じて、参加費のオンライン決済にも対応',
    body: '参加費の事前回収や未入金確認が必要な団体向けに、オンライン決済連携も用意しています。まずは無料の募集ページと予約管理から始められます。',
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
            <div className="shrink-0">
              <div className="flex items-end gap-3">
                {[
                  { src: '/shuttles-calendar.svg', label: 'カレンダー' },
                  { src: '/shuttles-event-cards.svg', label: 'カード' },
                  { src: '/shuttles-schedule-cards.svg', label: 'スレッド' },
                ].map(({ src, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={label}
                      height={220}
                      style={{ height: '220px', width: 'auto', display: 'block' }}
                      className="rounded-lg"
                    />
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
