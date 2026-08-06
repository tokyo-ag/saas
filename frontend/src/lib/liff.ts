'use client';

import liff from '@line/liff';
import { setLiffToken } from './api';

let initialized = false;
let initializedLiffId: string | null = null;
let resolvedLiffId: string | null = null;
let usingTenantLiff = false;
let lastError: string | null = null;
let initInfo: { ok: boolean; hasId: boolean; loggedIn: boolean } | null = null;

const LIFF_LOGIN_TRY_KEY = 'liff-login-tried';
const LIFF_LOGIN_RETRY_INTERVAL_MS = 5 * 60 * 1000;

async function getLiffId(): Promise<string> {
  if (resolvedLiffId) return resolvedLiffId;
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/^\/liff\/([^/]+)/);
    if (match) {
      try {
        const tenantId = decodeURIComponent(match[1]);
        const res = await fetch(`/api/backend/liff/${encodeURIComponent(tenantId)}`);
        if (res.ok) {
          const tenant = (await res.json()) as { liffId?: string | null };
          if (tenant.liffId?.trim()) {
            resolvedLiffId = tenant.liffId.trim();
            usingTenantLiff = true;
            return resolvedLiffId;
          }
        }
      } catch (err) {
        console.error('[LIFF] tenant LIFF ID lookup failed:', err);
      }
    }
  }
  resolvedLiffId = process.env.NEXT_PUBLIC_LIFF_ID ?? '';
  return resolvedLiffId;
}

export function getInitError(): string | null {
  return lastError;
}

export function getInitInfo() {
  return initInfo;
}

// liff.init()が未実行/失敗の状態でliff.isLoggedIn()を呼ぶとSDKが例外を投げるため、
// 常にこちらを経由して呼び出す（呼び出し側でのtry/catchの重複を避ける）。
export function isLiffLoggedIn(): boolean {
  try {
    return liff.isLoggedIn();
  } catch {
    return false;
  }
}

export async function initLiff(): Promise<boolean> {
  const id = await getLiffId();
  if (initialized && initializedLiffId === id) {
    // 既に初期化済みでも、ページ遷移や時間経過でトークンが古くなっている可能性があるため
    // liff.init()はスキップしつつ、トークンだけは毎回取り直す。
    setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
    return true;
  }
  if (!id) {
    lastError = 'LIFF_ID未設定';
    return false;
  }
  if (initialized && initializedLiffId !== id) {
    lastError = 'LIFF_ID changed after initialization';
    return false;
  }

  try {
    await withTimeout(
      liff.init({ liffId: id }),
      10000,
      'LIFF初期化がタイムアウトしました',
    );
    initialized = true;
    initializedLiffId = id;
    lastError = null;
    setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
    initInfo = { ok: true, hasId: Boolean(id), loggedIn: isLiffLoggedIn() };
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

export function buildCurrentLiffUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const id = initializedLiffId ?? resolvedLiffId;
  if (!id) return null;

  const current = new URL(window.location.href);
  const params = new URLSearchParams(current.search);
  params.delete('code');
  params.delete('state');
  params.delete('liff.state');

  const tenantMatch = current.pathname.match(/^(\/liff\/[^/]+)(.*)$/);
  if (!usingTenantLiff) {
    const pathWithQuery = `${current.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    const fallbackUrl = new URL(`https://liff.line.me/${id}`);
    fallbackUrl.searchParams.set('liff.state', pathWithQuery);
    return fallbackUrl.toString();
  }
  const suffix = tenantMatch?.[2] ?? '';
  const liffUrl = new URL(`https://liff.line.me/${id}${suffix}`);
  for (const [key, value] of params.entries()) {
    liffUrl.searchParams.append(key, value);
  }
  return liffUrl.toString();
}

export function redirectToLiffApp(): boolean {
  const url = buildCurrentLiffUrl();
  if (!url) return false;
  window.location.href = url;
  return true;
}

function exposeDebugValue(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>)[key] = value;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(errorMessage)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timeout);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timeout);
        reject(err);
      });
  });
}

export function hasRecentLoginAttempt(): boolean {
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
  if (isLiffLoggedIn()) return true;

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

// liff.getProfile()はLIFFアプリのスコープ設定不足などで例外を投げることがあり、
// 呼び出し側の大半がtry/catch無しでuidを取得しているため、ここで吸収して
// ページが「読み込み中...」のまま固まるのを防ぐ。
export async function getLiffUserId(): Promise<string | null> {
  if (!isLiffLoggedIn()) return null;
  try {
    const profile = await liff.getProfile();
    return profile.userId;
  } catch (err) {
    console.error('[LIFF] getProfile failed:', err);
    return null;
  }
}

export async function getLiffProfile(): Promise<{ userId: string; displayName: string; pictureUrl?: string } | null> {
  if (!isLiffLoggedIn()) return null;
  try {
    const profile = await liff.getProfile();
    return { userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl };
  } catch (err) {
    console.error('[LIFF] getProfile failed:', err);
    return null;
  }
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
