import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { API_URL } from '@/lib/config';

async function verifySuperadminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/superadmin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    request.cookies.get('admin_token')?.value;

  if (!(await verifySuperadminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';

  revalidatePath('/organizers');
  revalidatePath('/guide');
  if (slug) revalidatePath(`/guide/${slug}`);
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true });
}
