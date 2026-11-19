import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { put } from '@vercel/blob';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Magic bytes for supported formats
const MAGIC_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
];

function detectMimeFromBytes(buf: ArrayBuffer): string | null {
  const view = new Uint8Array(buf, 0, 12);
  for (const sig of MAGIC_SIGNATURES) {
    const off = sig.offset ?? 0;
    if (sig.bytes.every((b, i) => view[off + i] === b)) {
      if (sig.mime === 'image/webp') {
        // WebP requires 'WEBP' at offset 8
        if (view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) {
          return 'image/webp';
        }
        continue;
      }
      return sig.mime;
    }
  }
  return null;
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadToR2(filename: string, buffer: ArrayBuffer, contentType: string): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!bucket || !publicUrl) {
    throw new Error('R2_BUCKET_NAME or NEXT_PUBLIC_R2_PUBLIC_URL not configured');
  }
  const key = `icons/${filename}`;
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(buffer),
    ContentType: contentType,
  }));
  return `${publicUrl.replace(/\/$/, '')}/${key}`;
}

async function uploadToVercelBlob(filename: string, buffer: ArrayBuffer, contentType: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN not set');
  }
  const blob = await put(`icons/${filename}`, buffer, {
    access: 'public',
    contentType,
    token,
  });
  return blob.url;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // STORAGE_PROVIDER=r2 → Cloudflare R2, それ以外 → Vercel Blob (後方互換)
  const storageProvider = process.env.STORAGE_PROVIDER ?? 'vercel';

  if (storageProvider === 'r2') {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: 'R2 credentials not configured' }, { status: 500 });
    }
    if (!process.env.R2_BUCKET_NAME || !process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
      return NextResponse.json({ error: 'R2 bucket configuration missing' }, { status: 500 });
    }
  } else {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not set' }, { status: 500 });
    }
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    const mimeBase = contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeBase)) {
      return NextResponse.json(
        { error: 'JPEG・PNG・GIF・WebP形式の画像のみアップロードできます。HEIC（iPhone標準形式）はサポートしていません。' },
        { status: 415 }
      );
    }

    const buffer = await request.arrayBuffer();

    const detectedMime = detectMimeFromBytes(buffer);
    if (!detectedMime) {
      return NextResponse.json(
        { error: 'ファイルの形式を認識できませんでした。JPEG・PNG・GIF・WebP形式の画像をアップロードしてください。' },
        { status: 415 }
      );
    }
    if (detectedMime !== mimeBase) {
      return NextResponse.json(
        { error: 'ファイルの拡張子と実際の形式が一致しません。正しい形式の画像をアップロードしてください。' },
        { status: 415 }
      );
    }
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 5MB)' }, { status: 413 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') ?? `upload-${Date.now()}.jpg`;

    const url = storageProvider === 'r2'
      ? await uploadToR2(filename, buffer, contentType)
      : await uploadToVercelBlob(filename, buffer, contentType);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
