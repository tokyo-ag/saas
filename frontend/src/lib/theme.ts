export type ThemeId = 'green' | 'pink' | 'yellow' | 'blue' | 'purple' | 'mint';

export const THEMES: { id: ThemeId; label: string; primary: string; hover: string; swatch: string }[] = [
  { id: 'green',  label: 'グリーン',  primary: '#06C755', hover: '#05a847', swatch: '#06C755' },
  { id: 'pink',   label: 'ピンク',    primary: '#e8729a', hover: '#d45f87', swatch: '#f4a7c0' },
  { id: 'yellow', label: 'イエロー',  primary: '#e8b84b', hover: '#d4a43c', swatch: '#fad97a' },
  { id: 'blue',   label: 'ブルー',    primary: '#4a9eed', hover: '#3889d6', swatch: '#8ec5f7' },
  { id: 'purple', label: 'パープル',  primary: '#9b72cf', hover: '#8660ba', swatch: '#c4a8e8' },
  { id: 'mint',   label: 'ミント',    primary: '#3cbf9f', hover: '#2fa88a', swatch: '#89ddc9' },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function getThemeCssVars(themeId: string): Record<string, string> {
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const rgb = hexToRgb(theme.primary);
  return {
    '--cp':    theme.primary,
    '--cp-h':  theme.hover,
    '--cp-5':  `rgba(${rgb},0.05)`,
    '--cp-8':  `rgba(${rgb},0.08)`,
    '--cp-10': `rgba(${rgb},0.10)`,
    '--cp-15': `rgba(${rgb},0.15)`,
    '--cp-20': `rgba(${rgb},0.20)`,
    '--cp-30': `rgba(${rgb},0.30)`,
  };
}
