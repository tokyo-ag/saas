import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const HOP_BY_HOP_HEADERS = [
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

function createTargetUrl(request: NextRequest, path: string[]): string {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, API_URL);
  targetUrl.search = incomingUrl.search;
  return targetUrl.toString();
}

function createForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  return headers;
}

async function proxy(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const method = request.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  const response = await fetch(createTargetUrl(request, path), {
    method,
    headers: createForwardHeaders(request),
    body,
    cache: 'no-store',
    redirect: 'manual',
  });

  const headers = new Headers(response.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  return new NextResponse(method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
