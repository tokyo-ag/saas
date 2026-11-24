import { NextResponse, type NextRequest } from 'next/server';

// LINE IAB (WKWebView) は Cache-Control: no-store を無視してディスクキャッシュから
// 古い HTML を返すことがある。デプロイごとに変わる _v パラメータを LIFF ページの
// URL に付加することで WKWebView に新しい URL として認識させ、キャッシュを回避する。
// 302 リダイレクトのレスポンス自体は WkWebView にキャッシュされないため、
// サーバーから常に最新の _v を受け取れる。
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  '';

export function middleware(request: NextRequest) {
  if (!BUILD_ID) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;

  // LIFFエンドポイントページにのみ適用
  if (!pathname.startsWith('/liff/')) return NextResponse.next();

  // OAuth コールバック (code/state) や既に _v 付きの URL はリダイレクト不要
  const hasOAuthCallback = searchParams.has('code') && searchParams.has('state');
  const hasVersion = searchParams.get('_v') === BUILD_ID;
  if (hasOAuthCallback || hasVersion) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.searchParams.set('_v', BUILD_ID);
  return NextResponse.redirect(url, { status: 302 });
}

export const config = {
  matcher: ['/liff/:path*'],
};
