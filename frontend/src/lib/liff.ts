'use client';

import liff from '@line/liff';
import { setLiffToken } from './api';

let initialized = false;
let lastError: string | null = null;

export function getInitError(): string | null {
  return lastError;
}

export async function initLiff(liffId?: string): Promise<boolean> {
  if (initialized) return true;
  const id = liffId ?? process.env.NEXT_PUBLIC_LIFF_ID ?? '';
  if (!id) {
    lastError = 'LIFF_ID未設定';
    return false;
  }
  try {
    await liff.init({ liffId: id });
    initialized = true;
    lastError = null;
    setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastError = `init失敗: ${msg}`;
    console.error('[LIFF] init failed:', err);
    return false;
  }
}

export async function loginIfNeeded(): Promise<void> {
  if (!liff.isLoggedIn()) {
    liff.login();
  }
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

export function closeLiff() {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}

export async function scanQrCode(): Promise<string | null> {
  // liff.scanCodeV2はスコープ設定が必要なためブラウザカメラで代替
  return null;
}

export { liff };
