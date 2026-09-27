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

const SAITAMA: Slice[] = [
  { name: '大宮国際動物専門学校', value: 8.0 },
  { name: '埼玉コンピュータ＆医療事務専門学校', value: 7.5 },
  { name: '中央情報専門学校', value: 7.0 },
  { name: 'さいたまIT・WEB専門学校', value: 6.5 },
  { name: '大宮情報ITクリエイター専門学校', value: 6.0 },
  { name: '西武調理師アート専門学校', value: 5.5 },
  { name: '埼玉県調理師専門学校', value: 5.0 },
  { name: '国際医療専門学校', value: 4.8 },
  { name: '早稲田医療技術専門学校', value: 4.5 },
  { name: '専門学校日本医科学大学校', value: 4.2 },
  { name: '大宮呉竹医療専門学校', value: 4.0 },
  { name: '専門学校埼玉自動車大学校', value: 3.8 },
  { name: 'ホンダテクニカルカレッジ関東', value: 3.5 },
  { name: '専門学校関東工業自動車大学校', value: 3.2 },
  { name: '秋草学園福祉教育専門学校', value: 3.0 },
  { name: '国際航空専門学校', value: 2.8 },
  { name: '埼玉歯科衛生専門学校', value: 2.5 },
  { name: '大宮歯科衛生士専門学校', value: 2.3 },
  { name: 'テクノ・ホルティ園芸専門学校', value: 2.0 },
  { name: '埼玉医療福祉専門学校', value: 1.8 },
  { name: '専門学校越生自動車大学校', value: 1.0 },
  { name: '上尾中央医療専門学校', value: 0.9 },
  { name: '幸手看護専門学校', value: 0.8 },
  { name: '済生会川口看護専門学校', value: 0.8 },
  { name: '埼玉医療福祉会看護専門学校', value: 0.8 },
  { name: 'さいたま柔整専門学校', value: 0.7 },
  { name: '坂戸鶴ヶ島医師会立看護専門学校', value: 0.7 },
  { name: '新洋国際専門学校', value: 0.7 },
  { name: '西武学園医学技術専門学校', value: 0.6 },
  { name: '専門学校浜西ファッションアカデミー', value: 0.6 },
  { name: '秩父看護専門学校', value: 0.6 },
  { name: '東京国際学園外語専門学校', value: 0.5 },
  { name: '東京国際学園情報専門学校', value: 0.5 },
  { name: '所沢看護専門学校', value: 0.5 },
  { name: '戸田中央看護専門学校', value: 0.5 },
  { name: '獨協医科大学附属看護専門学校三郷校', value: 0.5 },
  { name: '日本グローバル専門学校', value: 0.5 },
  { name: '飯能看護専門学校', value: 0.4 },
  { name: '本庄児玉看護専門学校', value: 0.4 },
  { name: '蕨戸田市医師会看護専門学校', value: 0.1 },
];

const CHIBA: Slice[] = [
  { name: '船橋情報ビジネス専門学校', value: 5.5 },
  { name: '千葉ビューティ＆ブライダル専門学校', value: 5.0 },
  { name: '千葉こども専門学校', value: 4.8 },
  { name: '東京IT会計公務員専門学校千葉校', value: 4.5 },
  { name: '専門学校国際理工カレッジ', value: 4.3 },
  { name: '国際トラベル・ホテル・ブライダル専門学校', value: 4.0 },
  { name: '専門学校ちば愛犬動物フラワー学園', value: 3.8 },
  { name: '東洋理容美容専門学校', value: 3.6 },
  { name: '千葉医療秘書＆IT専門学校', value: 3.5 },
  { name: '大原簿記公務員専門学校千葉校', value: 3.4 },
  { name: '大原医療保育福祉専門学校千葉校', value: 3.2 },
  { name: 'パリ総合美容専門学校千葉校', value: 3.0 },
  { name: 'ジェイ ヘアメイク美容専門学校', value: 2.8 },
  { name: 'アイ トータルビューティ専門学校', value: 2.7 },
  { name: '千葉リゾート＆スポーツ専門学校', value: 2.6 },
  { name: 'ハッピー製菓調理専門学校', value: 2.5 },
  { name: '千葉デザイナー学院', value: 2.4 },
  { name: '日本国際工科専門学校', value: 2.3 },
  { name: 'ユニバーサル美容専門学校', value: 2.2 },
  { name: '成田航空ビジネス専門学校', value: 2.1 },
  { name: '大原ビジネス公務員専門学校津田沼校', value: 2.0 },
  { name: '大原ビジネス公務員専門学校柏校', value: 2.0 },
  { name: 'パリ総合美容専門学校柏校', value: 1.9 },
  { name: '千葉情報ITクリエイター専門学校', value: 1.8 },
  { name: '東京情報ITクリエイター専門学校柏校', value: 1.7 },
  { name: '千葉情報経理専門学校', value: 1.6 },
  { name: '千葉モードビジネス専門学校', value: 1.6 },
  { name: '千葉女子専門学校', value: 1.5 },
  { name: '千葉調理師専門学校', value: 1.5 },
  { name: '千葉美容専門学校', value: 1.4 },
  { name: '千葉日建工科専門学校', value: 1.4 },
  { name: '成田国際福祉専門学校', value: 1.3 },
  { name: 'スカイ総合ペット専門学校', value: 1.3 },
  { name: '東京動物専門学校', value: 1.3 },
  { name: '国際医療福祉専門学校', value: 1.2 },
  { name: '江戸川学園おおたかの森専門学校', value: 1.2 },
  { name: '船橋国際福祉専門学校', value: 1.1 },
  { name: '千葉・柏リハビリテーション学院', value: 1.1 },
  { name: '北原学院歯科衛生専門学校', value: 1.0 },
  { name: '北原学院千葉歯科衛生専門学校', value: 1.0 },
  { name: '千葉薬事専門学校', value: 0.9 },
  { name: '習志野調理師専門学校', value: 0.9 },
  { name: '千葉県自動車大学校', value: 0.9 },
  { name: '専門学校日本自動車大学校', value: 0.9 },
  { name: '専門学校日本自動車大学校 袖ケ浦校', value: 0.8 },
  { name: '中央自動車大学校', value: 0.8 },
  { name: '関東鍼灸専門学校', value: 0.8 },
  { name: '八千代リハビリテーション学院', value: 0.8 },
  { name: '専門学校藤リハビリテーション学院', value: 0.7 },
  { name: '千葉医療福祉専門学校', value: 0.7 },
  { name: '医療創生大学歯科衛生専門学校', value: 0.7 },
  { name: '松山学園松山福祉専門学校', value: 0.6 },
  { name: '中央介護福祉専門学校', value: 0.6 },
  { name: '京葉介護福祉専門学校', value: 0.6 },
  { name: '専門学校新国際福祉カレッジ', value: 0.5 },
  { name: 'ユーカリが丘国際福祉専門学校', value: 0.5 },
  { name: '安房医療福祉専門学校', value: 0.5 },
  { name: '安房医療福祉専門学校南房総校', value: 0.4 },
  { name: '千葉市青葉看護専門学校', value: 0.4 },
  { name: '山王看護専門学校', value: 0.4 },
  { name: '慈恵柏看護専門学校', value: 0.4 },
  { name: '千葉労災看護専門学校', value: 0.4 },
  { name: '市原看護専門学校', value: 0.4 },
  { name: '勤医会東葛看護専門学校', value: 0.4 },
  { name: '亀田医療技術専門学校', value: 0.4 },
  { name: '二葉看護学院', value: 0.3 },
  { name: '旭中央病院附属看護専門学校', value: 0.3 },
  { name: 'あびこ助産師専門学校', value: 0.3 },
  { name: 'グローバルキャリア学院', value: 0.3 },
  { name: '専門学校ニホン国際ITカレッジ', value: 0.3 },
  { name: '上野国際ビジネス専門学校', value: 0.3 },
  { name: 'イーストウエスト外国語専門学校', value: 0.2 },
];

const REGIONS = [
  { key: 'tokyo', label: '東京エリア', title: '東京エリアの専門学生 参加分布', data: TOKYO, caption: '' },
  { key: 'saitama', label: '埼玉エリア', title: '埼玉エリアの専門学生 参加分布', data: SAITAMA, caption: '' },
  { key: 'chiba', label: '千葉エリア', title: '千葉エリアの専門学生 参加分布', data: CHIBA, caption: '' },
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
              {showAllSchools ? '閉じる' : `もっと見る（全${region.data.filter((s) => s.name !== 'その他').length}校）`}
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
