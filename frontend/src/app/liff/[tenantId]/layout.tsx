import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { LiffThemeProvider, DEFAULT_LIFF_THEME, type LiffTheme } from '@/components/liff/LiffThemeProvider';

// LIFFはLINEアプリ内ブラウザで開かれることが多く、古いキャッシュ済みページが
// 一瞬表示される事例があったため、この配下は一切キャッシュしない。
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_INDEX = { robots: { index: false, follow: false } } satisfies Partial<Metadata>;

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return `rgba(255,255,255,${opacity / 100})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity / 100})`;
}

async function fetchTheme(tenantId: string): Promise<LiffTheme> {
  try {
    const data = await fetch(`${API_URL}/api/public/tenant-theme/${tenantId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null);
    if (!data) return DEFAULT_LIFF_THEME;

    // WEBサイト側と同じテナント背景色を使う。カード等の中身は各ページ側で白固定にする。
    const bgBase = data.backgroundColor?.trim() || DEFAULT_LIFF_THEME.backgroundColor;
    const bgOpacity = typeof data.backgroundOpacity === 'number' ? data.backgroundOpacity : 100;
    const backgroundColor = hexToRgba(bgBase, bgOpacity);
    const navColor = data.navColor?.trim() || '#ffffff';
    const navOpacity = typeof data.navOpacity === 'number' ? data.navOpacity : 100;
    const navBg = hexToRgba(navColor, navOpacity);

    // 公開ページの「予約する」ボタン色（実際にWEBサイトで表示されている色）を最優先で使う
    let eventCardBg = DEFAULT_LIFF_THEME.eventCardBg;
    let reserveButtonColor: string | null = null;
    let borderColor = DEFAULT_LIFF_THEME.borderColor;
    try {
      const fd = JSON.parse(data.footerText ?? '{}');
      eventCardBg = fd.reserveEventCardBg?.trim() || DEFAULT_LIFF_THEME.eventCardBg || '#ffffff';
      reserveButtonColor = fd.reserveButtonBgColor?.trim() || null;
      borderColor = fd.globalBorderColor?.trim() || DEFAULT_LIFF_THEME.borderColor || '#E5E7EB';
    } catch { /* ignore */ }

    const accentColor = reserveButtonColor || data.accentColor?.trim() || DEFAULT_LIFF_THEME.accentColor;

    return { accentColor, backgroundColor, navBg, eventCardBg, borderColor };
  } catch {
    return DEFAULT_LIFF_THEME;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
  try {
    const { tenantId } = await params;
    const tenant = await fetch(`${API_URL}/api/liff/${tenantId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null);
    if (!tenant) return NO_INDEX;

    const name = tenant.name ?? tenant.lineDisplayName;
    const description = tenant.description ?? `${name}のイベント・交流会情報`;

    return {
      ...NO_INDEX,
      title: name,
      description,
      openGraph: {
        title: name,
        description,
        images: (tenant.linePictureUrl ?? tenant.iconUrl) ? [{ url: tenant.linePictureUrl ?? tenant.iconUrl, width: 400, height: 400 }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: name,
        description,
        images: (tenant.linePictureUrl ?? tenant.iconUrl) ? [tenant.linePictureUrl ?? tenant.iconUrl] : [],
      },
    };
  } catch {
    return NO_INDEX;
  }
}

export default async function LiffLayout({ children, params }: { children: React.ReactNode; params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const theme = await fetchTheme(tenantId);
  return <LiffThemeProvider theme={theme}>{children}</LiffThemeProvider>;
}
