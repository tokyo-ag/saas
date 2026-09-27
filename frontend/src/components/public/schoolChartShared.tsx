// BELL専用の学校別参加分布ウィジェット（大学・短大・専門学校）で共有する
// 型とユーティリティ。円グラフの色、%表示、上位N件＋その他への丸めロジックなど。

export type Slice = { name: string; value: number };

export const COLORS = [
  '#06C755', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#0EA5E9', '#D946EF', '#22C55E', '#EAB308', '#F43F5E',
  '#A855F7', '#10B981', '#FB923C', '#64748B', '#9CA3AF',
];

export function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

// 上位N校と、残りを「その他」にまとめた合計に分ける（円グラフが埋まりすぎないように）。
// 元データに既に「その他」行がある場合（専門学校など）は、それをランキング対象から
// 除外し、算出した残り合計にそのまま合算する（「その他」が2行に分裂しないように）。
export function splitTopAndOthers(
  data: Slice[],
  topN: number,
): { top: Slice[]; rest: Slice[]; othersTotal: number } {
  const preexistingOthers = data.find((s) => s.name === 'その他')?.value ?? 0;
  const named = data.filter((s) => s.name !== 'その他');
  const sorted = [...named].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const othersTotal =
    Math.round((rest.reduce((sum, s) => sum + s.value, 0) + preexistingOthers) * 10) / 10;
  return { top, rest, othersTotal };
}

export function SchoolRow({ slice, colorIndex }: { slice: Slice; colorIndex: number }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[colorIndex % COLORS.length] }} />
      <span className="truncate">{slice.name}</span>
      <span className="ml-auto shrink-0 font-semibold">{formatPercent(slice.value)}</span>
    </li>
  );
}
