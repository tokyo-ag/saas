import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { API_URL } from '@/lib/config';

async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminToken =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    request.cookies.get('admin_token')?.value;

  if (!(await verifyAdminToken(adminToken))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tenantCode = typeof body.tenantCode === 'string' ? body.tenantCode.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const blogSlug = typeof body.blogSlug === 'string' ? body.blogSlug.trim() : '';

  if (!tenantCode || (!slug && !blogSlug)) {
    return NextResponse.json({ error: 'tenantCode and slug or blogSlug are required' }, { status: 400 });
  }

  revalidatePath(`/clubs/${tenantCode}`);
  if (slug) {
    revalidatePath(`/clubs/${tenantCode}/${slug}`);
  }
  if (blogSlug) {
    revalidatePath(`/clubs/${tenantCode}/blog/${blogSlug}`);
  }
  revalidatePath(`/clubs/${tenantCode}/blog`);
  revalidatePath(`/clubs/${tenantCode}/reserve`);
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true });
}
