import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

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

    const blob = await put(`icons/${filename}`, buffer, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
