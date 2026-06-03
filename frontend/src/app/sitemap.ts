import type { MetadataRoute } from 'next';

import { SITE_URL, API_URL } from '@/lib/config';

type SitemapEvent = { id: string; tenantCode: string; updatedAt: string };
type SitemapTenant = { tenantCode: string; updatedAt: string };

let lastSuccessfulEvents: SitemapEvent[] = [];
let lastSuccessfulTenants: SitemapTenant[] = [];

function staticLastModified() {
  const value = process.env.NEXT_PUBLIC_SITE_LAST_MODIFIED;
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

const STATIC_LAST_MODIFIED = staticLastModified();

async function fetchSitemapEvents(): Promise<{ id: string; tenantCode: string; updatedAt: string }[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-events`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`sitemap-events returned ${res.status}`);
    const events = (await res.json()) as SitemapEvent[];
    lastSuccessfulEvents = events;
    return events;
  } catch (error) {
    if (lastSuccessfulEvents.length > 0) {
      console.warn('[sitemap] using cached events after API failure', error);
    }
    return lastSuccessfulEvents;
  }
}

async function fetchSitemapTenants(): Promise<SitemapTenant[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-tenants`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`sitemap-tenants returned ${res.status}`);
    const tenants = (await res.json()) as SitemapTenant[];
    lastSuccessfulTenants = tenants;
    return tenants;
  } catch (error) {
    if (lastSuccessfulTenants.length > 0) {
      console.warn('[sitemap] using cached tenants after API failure', error);
    }
    return lastSuccessfulTenants;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, tenants] = await Promise.all([
    fetchSitemapEvents(),
    fetchSitemapTenants(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/events/meetup`, changeFrequency: 'daily', priority: 0.85, lastModified: STATIC_LAST_MODIFIED },
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
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.5, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3, lastModified: STATIC_LAST_MODIFIED },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${SITE_URL}/e/${e.tenantCode}/${e.id}`,
    lastModified: e.updatedAt ? new Date(e.updatedAt) : STATIC_LAST_MODIFIED,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const clubPages: MetadataRoute.Sitemap = tenants.map((t) => ({
    url: `${SITE_URL}/clubs/${t.tenantCode}`,
    lastModified: t.updatedAt ? new Date(t.updatedAt) : STATIC_LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [...staticPages, ...clubPages, ...eventPages];
}
