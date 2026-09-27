'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type Slice = { name: string; value: number };

// インカレサークルBELL専用のハードコードされた参加実績データ（仮割合）。
// 予約実績が増えたら「その他」から個別の大学が独立していく想定で、
// 更新のたびにこの配列を直接書き換える。
const NATIONAL_COED: Slice[] = [
  { name: '東京学芸大学', value: 17 },
  { name: '東京外国語大学', value: 15 },
  { name: '東京農工大学', value: 14 },
  { name: '一橋大学', value: 13 },
  { name: '東京大学', value: 11 },
  { name: '電気通信大学', value: 10 },
  { name: '東京海洋大学', value: 8 },
  { name: '東京科学大学', value: 7 },
  { name: '東京藝術大学', value: 5 },
];

// 東京都内の私立大学（共学）99校。割合はCOMIU初期表示用の仮値
// （文部科学省の学校規模データを参考にした按分）で、実予約が
// 増え次第この配列を書き換えて置き換える前提。
const PRIVATE_COED_FULL: Slice[] = [
  { name: '立教大学', value: 4.75 },
  { name: '東洋大学', value: 4.49 },
  { name: '日本大学', value: 4.32 },
  { name: '法政大学', value: 4.15 },
  { name: '明治大学', value: 3.89 },
  { name: '早稲田大学', value: 3.63 },
  { name: '帝京平成大学', value: 3.28 },
  { name: '中央大学', value: 3.11 },
  { name: '駒澤大学', value: 2.85 },
  { name: '専修大学', value: 2.68 },
  { name: '大東文化大学', value: 2.42 },
  { name: '國學院大學', value: 2.33 },
  { name: '青山学院大学', value: 2.16 },
  { name: '学習院大学', value: 2.07 },
  { name: '明治学院大学', value: 1.99 },
  { name: '国士舘大学', value: 1.9 },
  { name: '成蹊大学', value: 1.82 },
  { name: '東海大学', value: 1.73 },
  { name: '東京理科大学', value: 1.64 },
  { name: '亜細亜大学', value: 1.56 },
  { name: '武蔵大学', value: 1.47 },
  { name: '東京電機大学', value: 1.38 },
  { name: '東京農業大学', value: 1.38 },
  { name: '帝京大学', value: 1.38 },
  { name: '桜美林大学', value: 1.3 },
  { name: '大正大学', value: 1.3 },
  { name: '東京経済大学', value: 1.21 },
  { name: '武蔵野大学', value: 1.21 },
  { name: '明星大学', value: 1.12 },
  { name: '文京学院大学', value: 1.12 },
  { name: '目白大学', value: 1.04 },
  { name: '東洋学園大学', value: 1.04 },
  { name: '東京工科大学', value: 0.95 },
  { name: '成城大学', value: 0.95 },
  { name: '拓殖大学', value: 0.95 },
  { name: '東京未来大学', value: 0.86 },
  { name: '杏林大学', value: 0.86 },
  { name: '東京家政学院大学', value: 0.78 },
  { name: '高千穂大学', value: 0.78 },
  { name: '東京富士大学', value: 0.78 },
  { name: '玉川大学', value: 0.78 },
  { name: '工学院大学', value: 0.78 },
  { name: '芝浦工業大学', value: 0.69 },
  { name: '東京都市大学', value: 0.69 },
  { name: '順天堂大学', value: 0.69 },
  { name: '上智大学', value: 0.69 },
  { name: '創価大学', value: 0.61 },
  { name: '多摩大学', value: 0.61 },
  { name: '多摩美術大学', value: 0.61 },
  { name: '武蔵野美術大学', value: 0.61 },
  { name: '文化学園大学', value: 0.61 },
  { name: '杉野服飾大学', value: 0.52 },
  { name: '国立音楽大学', value: 0.52 },
  { name: '東京音楽大学', value: 0.52 },
  { name: '東京工芸大学', value: 0.52 },
  { name: '東京造形大学', value: 0.52 },
  { name: '東京通信大学', value: 0.52 },
  { name: 'デジタルハリウッド大学', value: 0.52 },
  { name: '嘉悦大学', value: 0.43 },
  { name: '和光大学', value: 0.43 },
  { name: '東京成徳大学', value: 0.43 },
  { name: '日本体育大学', value: 0.43 },
  { name: '東京国際大学', value: 0.43 },
  { name: '北里大学', value: 0.35 },
  { name: '慶應義塾大学', value: 0.35 },
  { name: '国際基督教大学', value: 0.35 },
  { name: '聖路加国際大学', value: 0.35 },
  { name: '東京医療保健大学', value: 0.35 },
  { name: '東京薬科大学', value: 0.35 },
  { name: '東邦大学', value: 0.35 },
  { name: '星薬科大学', value: 0.26 },
  { name: '明治薬科大学', value: 0.26 },
  { name: '東京医科大学', value: 0.26 },
  { name: '日本医科大学', value: 0.26 },
  { name: '東京歯科大学', value: 0.26 },
  { name: '東京慈恵会医科大学', value: 0.26 },
  { name: '昭和医科大学', value: 0.26 },
  { name: '昭和薬科大学', value: 0.26 },
  { name: '東京有明医療大学', value: 0.26 },
  { name: '東京医療学院大学', value: 0.26 },
  { name: '日本赤十字看護大学', value: 0.26 },
  { name: '日本社会事業大学', value: 0.26 },
  { name: '日本獣医生命科学大学', value: 0.26 },
  { name: '日本歯科大学', value: 0.17 },
  { name: '日本文化大学', value: 0.17 },
  { name: '東京純心大学', value: 0.17 },
  { name: '白梅学園大学', value: 0.17 },
  { name: 'こども教育宝仙大学', value: 0.17 },
  { name: '東京聖栄大学', value: 0.17 },
  { name: '国際ファッション専門職大学', value: 0.17 },
  { name: '東京国際工科専門職大学', value: 0.17 },
  { name: '情報経営イノベーション専門職大学', value: 0.17 },
  { name: '東京情報デザイン専門職大学', value: 0.17 },
  { name: '東京保健医療専門職大学', value: 0.17 },
  { name: 'ビジネス・ブレークスルー大学', value: 0.17 },
  { name: '東京神学大学', value: 0.09 },
  { name: 'ルーテル学院大学', value: 0.09 },
  { name: '桐朋学園大学', value: 0.09 },
  { name: 'ヤマザキ動物看護大学', value: 0.09 },
];

// 国公立の女子大はお茶の水女子大学のみのため、私立女子大グループにまとめる。
const WOMENS: Slice[] = [
  { name: '日本女子大学', value: 12 },
  { name: '大妻女子大学', value: 10 },
  { name: '共立女子大学', value: 9 },
  { name: '東京家政大学', value: 9 },
  { name: '実践女子大学', value: 8 },
  { name: '跡見学園女子大学', value: 8 },
  { name: '昭和女子大学', value: 7 },
  { name: '東京女子大学', value: 6 },
  { name: '津田塾大学', value: 5 },
  { name: '日本女子体育大学', value: 5 },
  { name: '女子美術大学', value: 4 },
  { name: '白百合女子大学', value: 4 },
  { name: '聖心女子大学', value: 3 },
  { name: '駒沢女子大学', value: 3 },
  { name: '東京女子体育大学', value: 2 },
  { name: '清泉女子大学', value: 2 },
  { name: '東京女子医科大学', value: 2 },
  { name: '恵泉女学園大学', value: 1 },
  { name: 'お茶の水女子大学（国公立）', value: 1 },
];

// 短大（東京・埼玉・千葉・神奈川）55校。COMIU初期表示用の仮割合。
const JUNIOR_COLLEGE: Slice[] = [
  { name: '戸板女子短期大学', value: 6.0 },
  { name: '共立女子短期大学', value: 5.0 },
  { name: '大妻女子大学短期大学部', value: 4.5 },
  { name: '目白大学短期大学部', value: 4.0 },
  { name: '帝京短期大学', value: 3.8 },
  { name: '東京成徳短期大学', value: 3.5 },
  { name: '貞静学園短期大学', value: 3.2 },
  { name: '新渡戸文化短期大学', value: 3.0 },
  { name: '国際短期大学', value: 2.8 },
  { name: '東京立正短期大学', value: 2.7 },
  { name: '有明教育芸術短期大学', value: 2.5 },
  { name: '白梅学園短期大学', value: 2.4 },
  { name: '駒沢女子短期大学', value: 2.3 },
  { name: '女子美術大学短期大学部', value: 2.2 },
  { name: '山野美容芸術短期大学', value: 2.1 },
  { name: '帝京大学短期大学', value: 2.0 },
  { name: '桐朋学園芸術短期大学', value: 1.9 },
  { name: '日本栄養大学短期大学部', value: 1.8 },
  { name: '上野学園短期大学', value: 1.7 },
  { name: '東京女子体育短期大学', value: 1.6 },
  { name: '東京交通短期大学', value: 1.4 },
  { name: '創価女子短期大学', value: 1.4 },
  { name: '星美学園短期大学', value: 1.3 },
  { name: 'フェリシアこども短期大学', value: 1.2 },
  { name: '愛国学園短期大学', value: 1.1 },
  { name: '東邦音楽短期大学', value: 1.0 },
  { name: 'ヤマザキ動物看護専門職短期大学', value: 0.9 },
  { name: '東京歯科大学短期大学', value: 0.8 },
  { name: '日本歯科大学東京短期大学', value: 0.7 },
  { name: '日本大学短期大学部', value: 0.7 },
  { name: '埼玉女子短期大学', value: 2.8 },
  { name: '秋草学園短期大学', value: 2.2 },
  { name: '川口短期大学', value: 2.0 },
  { name: '国際学院埼玉短期大学', value: 1.7 },
  { name: '武蔵野短期大学', value: 1.4 },
  { name: '埼玉東萌短期大学', value: 1.3 },
  { name: '山村学園短期大学', value: 1.2 },
  { name: '武蔵丘短期大学', value: 1.0 },
  { name: '埼玉純真短期大学', value: 0.8 },
  { name: '埼玉医科大学短期大学', value: 0.6 },
  { name: '聖徳大学短期大学部', value: 2.0 },
  { name: '千葉経済大学短期大学部', value: 1.6 },
  { name: '昭和学院短期大学', value: 1.4 },
  { name: '敬愛短期大学', value: 1.2 },
  { name: '千葉明徳短期大学', value: 1.0 },
  { name: '清和大学短期大学部', value: 0.8 },
  { name: '相模女子大学短期大学部', value: 1.8 },
  { name: '鎌倉女子大学短期大学部', value: 1.5 },
  { name: '湘北短期大学', value: 1.4 },
  { name: '鶴見大学短期大学部', value: 1.2 },
  { name: '昭和音楽大学短期大学部', value: 1.1 },
  { name: '洗足こども短期大学', value: 1.0 },
  { name: '和泉短期大学', value: 0.8 },
  { name: '小田原短期大学', value: 0.7 },
  { name: '神奈川歯科大学短期大学部', value: 0.5 },
];

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
    caption: '',
  },
] as const;

const TRUNCATE_TOP_N = 10;

const COLORS = [
  '#06C755', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#0EA5E9', '#D946EF', '#22C55E', '#EAB308', '#F43F5E',
  '#A855F7', '#10B981', '#FB923C', '#64748B', '#9CA3AF',
];

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

// 上位N校と、残りを「その他」にまとめた合計に分ける（円グラフが埋まりすぎないように）
function splitTopAndOthers(data: Slice[], topN: number): { top: Slice[]; rest: Slice[]; othersTotal: number } {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const othersTotal = Math.round(rest.reduce((sum, s) => sum + s.value, 0) * 10) / 10;
  return { top, rest, othersTotal };
}

function SchoolRow({ slice, colorIndex }: { slice: Slice; colorIndex: number }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[colorIndex % COLORS.length] }} />
      <span className="truncate">{slice.name}</span>
      <span className="ml-auto shrink-0 font-semibold">{formatPercent(slice.value)}</span>
    </li>
  );
}

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

export function BellUniversityBreakdown() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('national-coed');
  const [showAllSchools, setShowAllSchools] = useState(false);

  return (
    <div className="mt-8">
      {!open && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
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
