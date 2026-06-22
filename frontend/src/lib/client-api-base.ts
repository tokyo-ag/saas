function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

function envOr(name: string, fallback: string): string {
  const value = process.env[name] ? normalizeUrl(process.env[name]) : '';
  return value || fallback;
}

export const DIRECT_API_URL = withoutTrailingSlash(
  envOr('NEXT_PUBLIC_API_URL', 'http://localhost:3001'),
);

export const CLIENT_API_BASE =
  typeof window === 'undefined' ? `${DIRECT_API_URL}/api` : '/api/backend';
