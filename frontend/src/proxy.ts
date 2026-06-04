import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(request: NextRequest) {
  const canonicalRedirectEnabled =
    process.env.CANONICAL_REDIRECT_ENABLED === 'true';
  let canonicalUrl: URL;
  try {
    canonicalUrl = new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.link',
    );
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

  const { pathname } = request.nextUrl;

  // Admin auth guard. Cookie is written by setToken/setImpersonationToken in auth.ts.
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

  // Superadmin auth guard
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
