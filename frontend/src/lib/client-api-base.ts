function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const DIRECT_API_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
);

export const CLIENT_API_BASE =
  typeof window === 'undefined' ? `${DIRECT_API_URL}/api` : '/api/backend';
