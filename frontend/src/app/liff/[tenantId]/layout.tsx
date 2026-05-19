import { getThemeCssVars } from '@/lib/theme';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';

async function fetchTheme(tenantId: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenant-theme/${tenantId}`, { next: { revalidate: 300 } });
    if (!res.ok) return 'green';
    const data = await res.json();
    return data.themeColor ?? 'green';
  } catch {
    return 'green';
  }
}

export default async function LiffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const theme = await fetchTheme(tenantId);
  const vars = getThemeCssVars(theme);

  return (
    <div style={vars as React.CSSProperties}>
      {children}
    </div>
  );
}
