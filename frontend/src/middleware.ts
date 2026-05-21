import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// These are actual sub-routes, not tenant IDs
const ADMIN_SUBROUTES = new Set([
  'events', 'members', 'messages', 'settings', 'support', 'superadmin', 'login', 'dashboard',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/[tenantId] or /admin/[tenantId]/... → rewrite to /admin/...
  if (pathname.startsWith('/admin/')) {
    const afterAdmin = pathname.slice('/admin/'.length); // e.g. "abc-uuid/events" or "events"
    const firstSegment = afterAdmin.split('/')[0];
    if (firstSegment && !ADMIN_SUBROUTES.has(firstSegment)) {
      const rest = afterAdmin.slice(firstSegment.length); // e.g. "/events" or ""
      const url = request.nextUrl.clone();
      url.pathname = `/admin${rest}`;
      return NextResponse.rewrite(url);
    }
  }

  // Admin auth guard — cookie written by setToken/setImpersonationToken in auth.ts
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload?.tenantId) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Superadmin auth guard
  if (pathname.startsWith('/superadmin') && !pathname.startsWith('/superadmin/login')) {
    const token = request.cookies.get('sa_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload?.isSuperadmin) {
        return NextResponse.redirect(new URL('/superadmin/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path+', '/superadmin/:path*'],
};
