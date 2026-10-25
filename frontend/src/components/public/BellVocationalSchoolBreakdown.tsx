'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Slice, COLORS, formatPercent, splitTopAndOthers, SchoolRow } from './schoolChartShared';
import {
  VOCATIONAL_TOKYO,
  VOCATIONAL_SAITAMA,
  VOCATIONAL_CHIBA,
  VOCATIONAL_KANAGAWA,
} from './bellSchoolData';

const REGIONS = [
  { key: 'tokyo', label: '東京エリア', title: '東京エリアの専門学生 参加分布', data: VOCATIONAL_TOKYO, caption: '' },
  { key: 'saitama', label: '埼玉エリア', title: '埼玉エリアの専門学生 参加分布', data: VOCATIONAL_SAITAMA, caption: '' },
  { key: 'chiba', label: '千葉エリア', title: '千葉エリアの専門学生 参加分布', data: VOCATIONAL_CHIBA, caption: '' },
  { key: 'kanagawa', label: '神奈川エリア', title: '神奈川エリアの専門学生 参加分布', data: VOCATIONAL_KANAGAWA, caption: '' },
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
              {showAllSchools ? '閉じる' : `もっと見る（全${region.data.filter((s: Slice) => s.name !== 'その他').length}校）`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BellVocationalSchoolBreakdown({ locked = false }: { locked?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<(typeof REGIONS)[number]['key']>('tokyo');
  const [showAllSchools, setShowAllSchools] = useState(false);

  return (
    <div className="mt-4">
      {!open && !locked && (
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
