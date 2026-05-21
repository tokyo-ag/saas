export const TOKEN_KEY = 'organizer_token';
const COOKIE_KEY = 'admin_token';

function setCookie(value: string) {
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}

function clearCookie() {
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // sessionStorage takes priority so impersonated tabs don't share state with others
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(token);
}

export function setImpersonationToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  setCookie(token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  clearCookie();
}

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)) as T;
  } catch {
    return null;
  }
}
