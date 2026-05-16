'use client';

import liff from '@line/liff';

let initialized = false;

export async function initLiff(liffId?: string): Promise<{ ok: boolean; reason?: string }> {
  if (initialized) return { ok: true };
  const id = liffId ?? process.env.NEXT_PUBLIC_LIFF_ID ?? '';
  if (!id) return { ok: false, reason: 'LIFF_ID未設定' };
  try {
    await liff.init({ liffId: id });
    initialized = true;
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[LIFF] init failed:', err);
    return { ok: false, reason: `init失敗: ${msg}` };
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
  try {
    const result = await liff.scanCodeV2();
    return result.value ?? null;
  } catch {
    return null;
  }
}

export { liff };
