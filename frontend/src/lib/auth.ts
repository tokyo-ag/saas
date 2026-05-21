export const TOKEN_KEY = 'organizer_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // sessionStorage takes priority so impersonated tabs don't share state with others
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setImpersonationToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)) as T;
  } catch {
    return null;
  }
}
