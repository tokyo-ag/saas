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

export const LIFF_ID = envOr('NEXT_PUBLIC_LIFF_ID', '');

export function buildLiffUrl(
  path: string,
  options?: {
    directInLineBrowser?: boolean;
    liffId?: string | null;
    endpointPath?: string;
  },
): string | null {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const liffId = options?.liffId?.trim() || LIFF_ID;
  if (!liffId) return null;
  const hasEndpointPath = options?.endpointPath !== undefined;
  const endpointPath = options?.endpointPath === '/'
    ? ''
    : (options?.endpointPath?.replace(/\/$/, '') ?? '');
  if (options?.liffId && hasEndpointPath) {
    const target = new URL(normalizedPath, SITE_URL);
    if (
      endpointPath === '' ||
      target.pathname === endpointPath ||
      target.pathname.startsWith(`${endpointPath}/`)
    ) {
      const suffix = target.pathname.slice(endpointPath.length);
      const url = new URL(`https://liff.line.me/${liffId}${suffix}`);
      url.search = target.search;
      url.hash = target.hash;
      return url.toString();
    }
  }
  const url = new URL(`https://liff.line.me/${liffId}`);
  url.searchParams.set('liff.state', normalizedPath);
  return url.toString();
}

// LINEアプリ内ブラウザで既にliff.line.meリンクを開くと、LINEが確認ダイアログを
// 挟んで新しいブラウザ画面を重ねて開いてしまう（元の画面の上に予約画面が
// 積み重なって見える）。既にLINEアプリ内なら直接パスへ遷移させて回避する。
export function isInLineInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /\bLine\//.test(navigator.userAgent);
}

export const DISCOVERY_LOCKED =
  process.env.NEXT_PUBLIC_DISCOVERY_LOCKED === 'true';

export const API_URL = withoutTrailingSlash(
  (process.env.API_BASE_URL ? normalizeUrl(process.env.API_BASE_URL) : '') ||
    envOr('NEXT_PUBLIC_API_URL', 'https://comiu.up.railway.app'),
);

export const IMAGE_BASE_URL = withoutTrailingSlash(
  envOr('NEXT_PUBLIC_API_URL', 'https://comiu.up.railway.app'),
);
