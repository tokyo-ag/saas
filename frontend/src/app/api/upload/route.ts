import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') ?? `upload-${Date.now()}`;

  const blob = await put(`events/${filename}`, request.body!, {
    access: 'public',
  });

  return NextResponse.json({ url: blob.url });
}
