export function imgUrl(url: string | null | undefined, apiUrl: string): string | null {
  if (!url) return null;
  if (url.includes('vercel-storage.com')) return `/api/img?url=${encodeURIComponent(url)}`;
  if (url.startsWith('http')) return url;
  return `${apiUrl}${url}`;
}
