import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/superadmin') || pathname.startsWith('/superadmin/login')) {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: '/superadmin/:path*',
};
