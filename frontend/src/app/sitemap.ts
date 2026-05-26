import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';
const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app';

async function fetchSitemapEvents(): Promise<{ id: string; tenantCode: string; updatedAt: string }[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-events`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchSitemapTenants(): Promise<{ tenantCode: string; updatedAt: string }[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-tenants`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, tenants] = await Promise.all([
    fetchSitemapEvents(),
    fetchSitemapTenants(),
  ]);

  const STATIC_LAST_MODIFIED = new Date('2026-05-01');

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/sports/badminton`, changeFrequency: 'daily', priority: 0.85, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/sports/basketball`, changeFrequency: 'daily', priority: 0.85, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/sports/futsal`, changeFrequency: 'daily', priority: 0.85, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/sports/volleyball`, changeFrequency: 'daily', priority: 0.85, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/use-cases`, changeFrequency: 'monthly', priority: 0.7, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/use-cases/badminton-tokyo`, changeFrequency: 'weekly', priority: 0.9, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/use-cases/basketball-tokyo`, changeFrequency: 'weekly', priority: 0.9, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/use-cases/futsal-tokyo`, changeFrequency: 'weekly', priority: 0.9, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/use-cases/volleyball-tokyo`, changeFrequency: 'weekly', priority: 0.9, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8, lastModified: STATIC_LAST_MODIFIED },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${SITE_URL}/e/${e.tenantCode}/${e.id}`,
    lastModified: new Date(e.updatedAt),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const clubPages: MetadataRoute.Sitemap = tenants.map((t) => ({
    url: `${SITE_URL}/clubs/${t.tenantCode}`,
    lastModified: new Date(t.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [...staticPages, ...clubPages, ...eventPages];
}
