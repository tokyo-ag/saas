import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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
  try {
    const adminToken =
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      request.cookies.get('admin_token')?.value;
    if (!(await verifyAdminToken(adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not set' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') ?? `upload-${Date.now()}`;
    const safeFilename =
      filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120) ||
      `upload-${Date.now()}`;
    const contentType = request.headers.get('content-type') ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 415 });
    }

    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large' }, { status: 413 });
    }

    const blob = await put(`events/${safeFilename}`, buffer, {
      access: 'public',
      contentType,
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
