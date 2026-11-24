import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// LINE IAB (WKWebView) は Cache-Control: no-store を無視してディスクキャッシュから
// 古い HTML を返すことがある。デプロイごとに変わる _v パラメータを LIFF ページの
// URL に付加することで WKWebView に新しい URL として認識させ、キャッシュを回避する。
// 302 リダイレクトのレスポンス自体は WkWebView にキャッシュされないため、
// サーバーから常に最新の _v を受け取れる。
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  '';

function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeLiffState(raw: string | null) {
  if (!raw) return null;
  let state = raw;
  const seen = new Set<string>();

  while (state && !seen.has(state)) {
    seen.add(state);

    try {
      const decoded = decodeURIComponent(state);
      if (decoded !== state) {
        state = decoded;
        continue;
      }
    } catch {
      // Keep the original state when decoding fails.
    }

    if (state.startsWith('?')) {
      const params = new URLSearchParams(state.slice(1));
      const nested = params.get('liff.state');
      if (nested) {
        params.delete('liff.state');
        const rest = params.toString();
        state = nested + (rest ? `?${rest}` : '');
        continue;
      }
    }

    break;
  }

  return state || null;
}

function getLiffStateRedirectUrl(request: NextRequest) {
  const state = normalizeLiffState(request.nextUrl.searchParams.get('liff.state'));
  if (!state) return null;

  const path = state.startsWith('/') ? state : `/${state}`;
  if (path === '/' || path.startsWith('//')) return null;

  // /clubs/... (SEOページ上でのインラインLINEログイン)はそのまま、それ以外は
  // 従来通り/liff/{tenantId}/...配下のページ向けとして/liffを補う。
  const target = path.startsWith('/liff/') || path.startsWith('/clubs/') ? path : `/liff${path}`;
  const redirectUrl = new URL(target, request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'liff.state') redirectUrl.searchParams.append(key, value);
  });
  return redirectUrl;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── カノニカルリダイレクト ──
  const canonicalRedirectEnabled = process.env.CANONICAL_REDIRECT_ENABLED === 'true';
  let canonicalUrl: URL;
  try {
    canonicalUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.link');
  } catch {
    canonicalUrl = new URL('https://comiu.link');
  }
  if (
    canonicalRedirectEnabled &&
    request.headers.get('host') === 'comiu.vercel.app' &&
    canonicalUrl.hostname !== 'comiu.vercel.app'
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = canonicalUrl.protocol;
    redirectUrl.hostname = canonicalUrl.hostname;
    redirectUrl.port = canonicalUrl.port;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // ── liff.state リダイレクト ──
  const liffStateRedirectUrl = getLiffStateRedirectUrl(request);
  if (liffStateRedirectUrl) {
    return NextResponse.redirect(liffStateRedirectUrl, { status: 307 });
  }

  // ── LIFF キャッシュバスト（LINE IAB WKWebView 対策） ──
  if (BUILD_ID && pathname.startsWith('/liff/')) {
    // OAuth コールバック (code/state) や既に _v 付きの URL はリダイレクト不要
    const hasOAuthCallback = searchParams.has('code') && searchParams.has('state');
    const hasVersion = searchParams.get('_v') === BUILD_ID;
    if (!hasOAuthCallback && !hasVersion) {
      const url = request.nextUrl.clone();
      url.searchParams.set('_v', BUILD_ID);
      const res = NextResponse.redirect(url, { status: 302 });
      // LINE IAB (WKWebView) は 302 レスポンスもキャッシュすることがあるため、
      // リダイレクト自体がキャッシュされて古い _v に固定されないよう no-store を付ける。
      res.headers.set('Cache-Control', 'no-store, no-cache');
      return res;
    }
  }

  // ── Admin 認証ガード ──
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const payload = decodeJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);
    if (
      !payload?.tenantId ||
      (typeof payload.exp === 'number' && payload.exp < now)
    ) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ── Superadmin 認証ガード ──
  if (
    pathname.startsWith('/superadmin') &&
    !pathname.startsWith('/superadmin/login')
  ) {
    const token = request.cookies.get('sa_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
    const payload = decodeJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);
    if (
      !payload?.isSuperadmin ||
      (typeof payload.exp === 'number' && payload.exp < now)
    ) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
};
