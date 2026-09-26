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

const TABS = [
  { key: 'national-coed', label: '国公立・共学', data: NATIONAL_COED, truncate: false },
  { key: 'private-coed', label: '私立・共学', data: PRIVATE_COED_FULL, truncate: true },
  { key: 'womens', label: '女子大', data: WOMENS, truncate: false },
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

// 上位N校＋「その他」にまとめた表示用データを作る（円グラフが埋まりすぎないように）
function topSlicesWithOthers(data: Slice[], topN: number): Slice[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const restTotal = sorted.slice(topN).reduce((sum, s) => sum + s.value, 0);
  return restTotal > 0 ? [...top, { name: 'その他', value: Math.round(restTotal * 10) / 10 }] : top;
}

export function BellUniversityBreakdown() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('national-coed');
  const [showAllSchools, setShowAllSchools] = useState(false);

  if (!open) {
    return (
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          もっとみる
        </button>
      </div>
    );
  }

  const active = TABS.find((t) => t.key === activeTab)!;
  const pieData = active.truncate ? topSlicesWithOthers(active.data, TRUNCATE_TOP_N) : active.data;
  const listData = active.truncate && !showAllSchools ? pieData : active.data;

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-gray-900">インカレサークルBELLの大学参加分布</h2>

      <div className="mb-4 flex gap-1.5 overflow-x-auto">
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

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
        {listData.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="truncate">{slice.name}</span>
            <span className="ml-auto shrink-0 font-semibold">{formatPercent(slice.value)}</span>
          </li>
        ))}
      </ul>

      {active.truncate && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowAllSchools((v) => !v)}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            {showAllSchools ? '閉じる' : `もっと見る（全${active.data.length}校）`}
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-400">※ 過去の参加実績をもとにした概算です</p>
    </div>
  );
}
