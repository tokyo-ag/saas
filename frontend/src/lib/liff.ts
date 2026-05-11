'use client';

import liff from '@line/liff';

let initialized = false;

export async function initLiff(liffId?: string): Promise<boolean> {
  if (initialized) return true;
  const id = liffId ?? process.env.NEXT_PUBLIC_LIFF_ID ?? '';
  if (!id) return false;
  try {
    await liff.init({ liffId: id });
    initialized = true;
    return true;
  } catch {
    return false;
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
    return false;
  }
}

export function closeLiff() {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}

export { liff };
