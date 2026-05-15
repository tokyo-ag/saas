import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') ?? `upload-${Date.now()}`;
  const contentType = request.headers.get('content-type') ?? 'application/octet-stream';

  const blob = await put(`events/${filename}`, request.body!, {
    access: 'public',
    contentType,
  });

  return NextResponse.json({ url: blob.url });
}
