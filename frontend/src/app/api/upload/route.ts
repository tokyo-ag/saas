import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 415 });
    }

    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 5MB)' }, { status: 413 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') ?? `upload-${Date.now()}.jpg`;
    const ext = filename.split('.').pop() ?? 'jpg';

    // 管理者トークンをフォワード（あれば）
    const adminToken =
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      request.cookies.get('admin_token')?.value;

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: contentType }), `upload.${ext}`);

    const headers: Record<string, string> = {};
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

    const res = await fetch(`${API_URL}/api/admin/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: text || 'Upload failed' }, { status: res.status });
    }

    const data = (await res.json()) as { url: string };
    const url = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
