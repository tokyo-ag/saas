'use client';

const LINE_TOKEN_KEY = 'line_id_token';
const LINE_USER_KEY = 'line_user';

export interface LineUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export function startLineLogin(channelId: string, returnPath: string) {
  if (typeof window === 'undefined') return;
  const state = btoa(JSON.stringify({ returnPath, nonce: Math.random().toString(36) }));
  const redirectUri = `${window.location.origin}/auth/line/callback`;
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', channelId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'profile openid');
  window.location.href = url.toString();
}

export function getLineToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(LINE_TOKEN_KEY);
}

export function storeLineSession(idToken: string, user: LineUser) {
  sessionStorage.setItem(LINE_TOKEN_KEY, idToken);
  sessionStorage.setItem(LINE_USER_KEY, JSON.stringify(user));
}

export function getLineUser(): LineUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LINE_USER_KEY);
    return raw ? (JSON.parse(raw) as LineUser) : null;
  } catch {
    return null;
  }
}

export function clearLineSession() {
  sessionStorage.removeItem(LINE_TOKEN_KEY);
  sessionStorage.removeItem(LINE_USER_KEY);
}
