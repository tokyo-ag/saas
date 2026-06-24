import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';
import { LiffThemeProvider, DEFAULT_LIFF_THEME, type LiffTheme } from '@/components/liff/LiffThemeProvider';

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
    const tenant = await fetch(`${API_URL}/api/liff/${tenantId}`, { next: { revalidate: 60 } })
      .then(r => r.ok ? r.json() : null);
    if (!tenant?.code) return DEFAULT_LIFF_THEME;

    const page = await fetch(`${API_URL}/api/public/tenants/${tenant.code}/pages/home`, { next: { revalidate: 60 } })
      .then(r => r.ok ? r.json() : null);
    if (!page) return DEFAULT_LIFF_THEME;

    const accentColor = page.accentColor?.trim() || DEFAULT_LIFF_THEME.accentColor;
    const backgroundColor = page.backgroundColor?.trim() || DEFAULT_LIFF_THEME.backgroundColor;
    const navColor = page.navColor?.trim() || '#ffffff';
    const navOpacity = typeof page.navOpacity === 'number' ? page.navOpacity : 100;
    const navBg = hexToRgba(navColor, navOpacity);

    let eventCardBg = DEFAULT_LIFF_THEME.eventCardBg;
    try {
      const fd = JSON.parse(page.footerText ?? '{}');
      eventCardBg = fd.reserveEventCardBg?.trim() || DEFAULT_LIFF_THEME.eventCardBg;
    } catch { /* ignore */ }

    return { accentColor, backgroundColor, navBg, eventCardBg };
  } catch {
    return DEFAULT_LIFF_THEME;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
  try {
    const { tenantId } = await params;
    const tenant = await fetch(`${API_URL}/api/liff/${tenantId}`, { next: { revalidate: 60 } })
      .then(r => r.ok ? r.json() : null);
    if (!tenant) return NO_INDEX;

    const name = tenant.lineDisplayName ?? tenant.name;
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
