import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin auth guard — cookie written by setToken/setImpersonationToken in auth.ts
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const now = Math.floor(Date.now() / 1000);
      if (!payload?.tenantId || (payload.exp && payload.exp < now)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
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
      const now = Math.floor(Date.now() / 1000);
      if (!payload?.isSuperadmin || (payload.exp && payload.exp < now)) {
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
