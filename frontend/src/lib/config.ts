function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const SITE_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.link',
);

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'comiunoreply@gmail.com';

export const OFFICIAL_LINE_URL =
  process.env.NEXT_PUBLIC_OFFICIAL_LINE_URL ?? 'https://lin.ee/oLnMgPkA';

export const API_URL = withoutTrailingSlash(
  process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'https://comiu.up.railway.app',
);

export const IMAGE_BASE_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app',
);
