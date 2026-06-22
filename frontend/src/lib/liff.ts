'use client';

import liff from '@line/liff';
import { setLiffToken } from './api';

let initialized = false;
let initializedLiffId: string | null = null;
let lastError: string | null = null;
let initInfo: { ok: boolean; hasId: boolean; loggedIn: boolean } | null = null;

const LIFF_LOGIN_TRY_KEY = 'liff-login-tried';
const LIFF_LOGIN_RETRY_INTERVAL_MS = 5 * 60 * 1000;

export function getInitError(): string | null {
  return lastError;
}

export function getInitInfo() {
  return initInfo;
}

export async function initLiff(): Promise<boolean> {
  const id = process.env.NEXT_PUBLIC_LIFF_ID ?? '';
  if (initialized && initializedLiffId === id) return true;
  if (!id) {
    lastError = 'LIFF_ID未設定';
    return false;
  }
  if (initialized && initializedLiffId !== id) {
    lastError = 'LIFF_ID changed after initialization';
    return false;
  }

  try {
    await liff.init({ liffId: id });
    initialized = true;
    initializedLiffId = id;
    lastError = null;
    setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);
    initInfo = { ok: true, hasId: Boolean(id), loggedIn: liff.isLoggedIn() };
    exposeDebugValue('__LIFF_INIT_INFO', initInfo);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastError = `init失敗: ${msg}`;
    console.error('[LIFF] init failed:', err);
    initInfo = { ok: false, hasId: Boolean(id), loggedIn: false };
    exposeDebugValue('__LIFF_INIT_ERROR', lastError);
    exposeDebugValue('__LIFF_INIT_INFO', initInfo);
    return false;
  }
}

function exposeDebugValue(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>)[key] = value;
}

function hasRecentLoginAttempt(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(LIFF_LOGIN_TRY_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as { timestamp?: number };
    return typeof data.timestamp === 'number' && Date.now() - data.timestamp < LIFF_LOGIN_RETRY_INTERVAL_MS;
  } catch {
    return false;
  }
}

function recordLoginAttempt(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    LIFF_LOGIN_TRY_KEY,
    JSON.stringify({ timestamp: Date.now() }),
  );
}

export async function loginIfNeeded(): Promise<boolean> {
  if (liff.isLoggedIn()) return true;

  if (liff.isInClient()) {
    exposeDebugValue('__LIFF_LOGIN_SKIPPED', true);
    return false;
  }

  if (typeof window === 'undefined') return false;
  if (hasRecentLoginAttempt()) return false;

  recordLoginAttempt();
  liff.login({ redirectUri: window.location.href });
  return false;
}

export async function getLiffUserId(): Promise<string | null> {
  if (!liff.isLoggedIn()) return null;
  const profile = await liff.getProfile();
  return profile.userId;
}

export async function getLiffProfile(): Promise<{ userId: string; displayName: string; pictureUrl?: string } | null> {
  if (!liff.isLoggedIn()) return null;
  const profile = await liff.getProfile();
  return { userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl };
}

export async function checkFriendship(): Promise<boolean> {
  try {
    const result = await liff.getFriendship();
    return result.friendFlag;
  } catch {
    return true;
  }
}

export { liff };
