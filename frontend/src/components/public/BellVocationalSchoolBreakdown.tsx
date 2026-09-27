'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Slice, COLORS, formatPercent, splitTopAndOthers, SchoolRow } from './schoolChartShared';

// インカレサークルBELL専用のハードコードされた参加実績データ（仮割合）。
// エリアごとに専門学校の参加分布を出す。まだ東京エリアしかデータがなく、
// 他エリアはデータが揃い次第REGIONSに追加する。
const TOKYO: Slice[] = [
  { name: '日本工学院専門学校', value: 7.0 },
  { name: '日本電子専門学校', value: 6.5 },
  { name: '東京ビューティーアート専門学校', value: 5.8 },
  { name: '文化服装学院', value: 5.5 },
  { name: '日本外国語専門学校', value: 4.8 },
  { name: '東京モード学園', value: 4.5 },
  { name: '東京こども専門学校', value: 4.0 },
  { name: '東京総合美容専門学校', value: 3.8 },
  { name: '東京リゾート＆スポーツ専門学校', value: 3.5 },
  { name: '東京デザイン系・その他専門学校', value: 3.3 },
  { name: '日本工学院八王子専門学校', value: 3.2 },
  { name: '東京コミュニケーションアート専門学校', value: 3.0 },
  { name: '東京スクールオブミュージック＆ダンス専門学校', value: 2.8 },
  { name: '東京服飾専門学校', value: 2.7 },
  { name: '東京美容専門学校', value: 2.5 },
  { name: '原宿ベルエポック美容専門学校', value: 2.5 },
  { name: '日本美容専門学校', value: 2.4 },
  { name: '東京スイーツ＆カフェ専門学校', value: 2.2 },
  { name: '東京福祉専門学校', value: 2.0 },
  { name: '東京医療系専門学校群', value: 2.0 },
  { name: 'その他', value: 27.0 },
];

const REGIONS = [
  { key: 'tokyo', label: '東京エリア', title: '東京エリアの専門学生 参加分布', data: TOKYO, caption: '' },
] as const;

const TRUNCATE_TOP_N = 10;

// このタブのHTMLは常にDOMへ出力する（学校名がクロールされるように）。
// 開閉やエリア切り替えは見た目上のCSS制御のみで行い、円グラフだけ開いた
// タブに限って描画する（非表示要素内だとrechartsが幅0のまま固まるため）。
function RegionPanel({
  region,
  isActiveRegion,
  isSectionOpen,
  showAllSchools,
  onToggleShowAll,
}: {
  region: (typeof REGIONS)[number];
  isActiveRegion: boolean;
  isSectionOpen: boolean;
  showAllSchools: boolean;
  onToggleShowAll: () => void;
}) {
  const { top, rest, othersTotal } = splitTopAndOthers(region.data, TRUNCATE_TOP_N);
  const pieData = othersTotal > 0 ? [...top, { name: 'その他', value: othersTotal }] : top;

  return (
    <div className={isActiveRegion ? '' : 'hidden'}>
      <h2 className="mb-1 text-sm font-bold text-gray-900">{region.title}</h2>
      {region.caption && <p className="mb-3 text-xs leading-relaxed text-gray-700">{region.caption}</p>}

      {isSectionOpen && isActiveRegion && (
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
        {othersTotal > 0 && <SchoolRow slice={{ name: 'その他', value: othersTotal }} colorIndex={top.length} />}
      </ul>

      {rest.length > 0 && (
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
              {showAllSchools ? '閉じる' : `もっと見る（全${region.data.length - 1}校）`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BellVocationalSchoolBreakdown() {
  const [open, setOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<(typeof REGIONS)[number]['key']>('tokyo');
  const [showAllSchools, setShowAllSchools] = useState(false);

  return (
    <div className="mt-4">
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
        {REGIONS.length > 1 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto">
            {REGIONS.map((region) => (
              <button
                key={region.key}
                type="button"
                onClick={() => setActiveRegion(region.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeRegion === region.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        )}

        {REGIONS.map((region) => (
          <RegionPanel
            key={region.key}
            region={region}
            isActiveRegion={activeRegion === region.key}
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
