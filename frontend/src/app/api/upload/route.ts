import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not set' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') ?? `upload-${Date.now()}`;
    const contentType = request.headers.get('content-type') ?? 'application/octet-stream';

    const buffer = await request.arrayBuffer();

    const blob = await put(`events/${filename}`, buffer, {
      access: 'public',
      contentType,
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
