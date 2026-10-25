'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Slice, COLORS, formatPercent, splitTopAndOthers, SchoolRow } from './schoolChartShared';
import {
  UNIVERSITY_NATIONAL_COED,
  UNIVERSITY_PRIVATE_COED,
  UNIVERSITY_WOMENS,
  UNIVERSITY_JUNIOR_COLLEGE,
} from './bellSchoolData';

const NATIONAL_COED: Slice[] = UNIVERSITY_NATIONAL_COED;
const PRIVATE_COED_FULL: Slice[] = UNIVERSITY_PRIVATE_COED;
const WOMENS: Slice[] = UNIVERSITY_WOMENS;
const JUNIOR_COLLEGE: Slice[] = UNIVERSITY_JUNIOR_COLLEGE;

const TABS = [
  {
    key: 'national-coed',
    label: '国公立・共学',
    data: NATIONAL_COED,
    truncate: false,
    caption: '『大学の友達が少ない』を解決。学年・学部関係なく、友達の幅を広げに来てください',
  },
  {
    key: 'private-coed',
    label: '私立・共学',
    data: PRIVATE_COED_FULL,
    truncate: true,
    caption: '「インカレサークルって大丈夫？」はもう卒業。ノンアル参加OK・初参加＆1人参加大歓迎だから、学内にはない出会いを気軽に広げられます◎',
  },
  {
    key: 'womens',
    label: '女子大',
    data: WOMENS,
    truncate: false,
    caption: 'お酒が苦手でも大丈夫、無理な勧誘もなし。安心して参加できるから、女子大の方にも人気です',
  },
  {
    key: 'junior-college',
    label: '短大',
    data: JUNIOR_COLLEGE,
    truncate: true,
    caption: '実習やテストで忙しい短大生でも大丈夫。BELLは単発参加OKだから、空いてる日だけサクッと参加して出会いを増やせます🙌',
  },
] as const;

const TRUNCATE_TOP_N = 10;

// このタブのHTMLは常にDOMへ出力する（大学名がクロールされるように）。
// 開閉やタブ切り替えは見た目上のCSS制御のみで行い、円グラフだけ開いた
// タブに限って描画する（非表示要素内だとrechartsが幅0のまま固まるため）。
function TabPanel({
  tab,
  isActiveTab,
  isSectionOpen,
  showAllSchools,
  onToggleShowAll,
}: {
  tab: (typeof TABS)[number];
  isActiveTab: boolean;
  isSectionOpen: boolean;
  showAllSchools: boolean;
  onToggleShowAll: () => void;
}) {
  const { top, rest, othersTotal } = tab.truncate
    ? splitTopAndOthers(tab.data, TRUNCATE_TOP_N)
    : { top: tab.data, rest: [] as Slice[], othersTotal: 0 };
  const pieData = tab.truncate && othersTotal > 0 ? [...top, { name: 'その他', value: othersTotal }] : top;

  return (
    <div className={isActiveTab ? '' : 'hidden'}>
      {tab.caption && <p className="mb-3 text-xs leading-relaxed text-gray-700">{tab.caption}</p>}

      {isSectionOpen && isActiveTab && (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
              {pieData.map((slice, i) => (
                <Cell key={slice.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [formatPercent(Number(value)), name]} />
          </PieChart>
        </ResponsiveContainer>
      )}

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
        {top.map((slice, i) => (
          <SchoolRow key={slice.name} slice={slice} colorIndex={i} />
        ))}
        {tab.truncate && othersTotal > 0 && (
          <SchoolRow slice={{ name: 'その他', value: othersTotal }} colorIndex={top.length} />
        )}
      </ul>

      {tab.truncate && rest.length > 0 && (
        <>
          <ul className={`mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 ${showAllSchools ? '' : 'hidden'}`}>
            {rest.map((slice, i) => (
              <SchoolRow key={slice.name} slice={slice} colorIndex={top.length + 1 + i} />
            ))}
          </ul>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onToggleShowAll}
              className="text-xs text-gray-400 underline hover:text-gray-600"
            >
              {showAllSchools ? '閉じる' : `もっと見る（全${tab.data.length}校）`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BellUniversityBreakdown({ onOpen }: { onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('national-coed');
  const [showAllSchools, setShowAllSchools] = useState(false);

  function handleOpen() {
    setOpen(true);
    onOpen?.();
  }

  return (
    <div className="mt-8">
      {!open && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleOpen}
            className="text-sm text-gray-400 underline hover:text-gray-600"
          >
            もっとみる
          </button>
        </div>
      )}

      {/* 折りたたみ中もHTML自体は出力し、CSSでのみ見た目を隠す（クロール対策） */}
      <div className={open ? 'rounded-2xl border border-gray-200 bg-white p-4' : 'hidden'}>
        <h2 className="mb-1 text-sm font-bold text-gray-900">インカレサークルBELLの大学参加分布</h2>
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          BELLには国公立・私立を問わず幅広い大学から参加しています。学年・学部もバラバラだから、あなたと同じ境遇の子もきっといます。
        </p>

        <div className="mb-3 flex gap-1.5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {TABS.map((tab) => (
          <TabPanel
            key={tab.key}
            tab={tab}
            isActiveTab={activeTab === tab.key}
            isSectionOpen={open}
            showAllSchools={showAllSchools}
            onToggleShowAll={() => setShowAllSchools((v) => !v)}
          />
        ))}

        <p className="mt-3 text-[11px] text-gray-400">※ 過去の参加実績をもとにした概算です</p>
      </div>
    </div>
  );
}
