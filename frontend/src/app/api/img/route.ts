import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !url.includes('vercel-storage.com')) {
    return new NextResponse('Invalid url', { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse('Not configured', { status: 500 });

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return new NextResponse(null, { status: res.status });

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
