const TOKEN_KEY = 'organizer_token';
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
  // 通常ログインを明示的に完了したら、同じタブに残った代理ログイン用トークンを
  // 必ず破棄する。残したままだとgetToken()で古いsessionStorage側が優先され、
  // ログイン直後の最初のAPIが401になって再びログイン画面へ戻される。
  sessionStorage.removeItem(TOKEN_KEY);
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
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as T;
  } catch {
    return null;
  }
}
