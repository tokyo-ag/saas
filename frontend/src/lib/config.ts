export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

// Railway 内部URLを使ったサーバーサイドデータフェッチ用
export const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';

// Vercel の Next.js 画像最適化が到達できる公開URL専用
export const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';
