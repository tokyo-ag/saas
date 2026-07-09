'use client';

import { createContext, useContext } from 'react';

export type LiffTheme = {
  accentColor: string;
  backgroundColor: string;
  navBg: string;
  eventCardBg: string;
  borderColor: string;
};

export const DEFAULT_LIFF_THEME: LiffTheme = {
  accentColor: '#06C755',
  backgroundColor: '#F5F5F5',
  navBg: '#ffffff',
  eventCardBg: '#ffffff',
  borderColor: '#E5E7EB',
};

const LiffThemeContext = createContext<LiffTheme>(DEFAULT_LIFF_THEME);

export function LiffThemeProvider({ theme, children }: { theme: LiffTheme; children: React.ReactNode }) {
  return <LiffThemeContext.Provider value={theme}>{children}</LiffThemeContext.Provider>;
}

export function useLiffTheme(): LiffTheme {
  return useContext(LiffThemeContext);
}

export function hexToRgba(hex: string, opacityPercent: number): string {
  const h = hex.trim().replace('#', '');
  if (h.length < 6) return `rgba(6,199,85,${opacityPercent / 100})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacityPercent / 100})`;
}

export function isLightHexColor(color: string): boolean {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export function readableTextColor(bgColor: string): string {
  return isLightHexColor(bgColor) ? '#111827' : '#ffffff';
}
