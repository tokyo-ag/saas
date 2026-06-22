function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function envOr(name: string, fallback: string) {
  const value = process.env[name] ? normalizeUrl(process.env[name]) : '';
  return value || fallback;
}

export const SITE_URL = withoutTrailingSlash(
  envOr('NEXT_PUBLIC_SITE_URL', 'https://comiu.link'),
);

export const SUPPORT_EMAIL =
  envOr('NEXT_PUBLIC_SUPPORT_EMAIL', 'comiunoreply@gmail.com');

export const OFFICIAL_LINE_URL =
  envOr('NEXT_PUBLIC_OFFICIAL_LINE_URL', 'https://lin.ee/oLnMgPkA');

export const DISCOVERY_LOCKED =
  process.env.NEXT_PUBLIC_DISCOVERY_LOCKED !== 'false';

export const API_URL = withoutTrailingSlash(
  (process.env.API_BASE_URL ? normalizeUrl(process.env.API_BASE_URL) : '') ||
    envOr('NEXT_PUBLIC_API_URL', 'https://comiu.up.railway.app'),
);

export const IMAGE_BASE_URL = withoutTrailingSlash(
  envOr('NEXT_PUBLIC_API_URL', 'https://comiu.up.railway.app'),
);
