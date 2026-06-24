'use client';

import { createContext, useContext } from 'react';

export type LiffTheme = {
  accentColor: string;
  backgroundColor: string;
  navBg: string;
  eventCardBg: string;
};

export const DEFAULT_LIFF_THEME: LiffTheme = {
  accentColor: '#06C755',
  backgroundColor: '#F5F5F5',
  navBg: '#ffffff',
  eventCardBg: '#ffffff',
};

const LiffThemeContext = createContext<LiffTheme>(DEFAULT_LIFF_THEME);

export function LiffThemeProvider({ theme, children }: { theme: LiffTheme; children: React.ReactNode }) {
  return <LiffThemeContext.Provider value={theme}>{children}</LiffThemeContext.Provider>;
}

export function useLiffTheme(): LiffTheme {
  return useContext(LiffThemeContext);
}
