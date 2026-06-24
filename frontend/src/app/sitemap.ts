import type { MetadataRoute } from 'next';

import { SITE_URL, API_URL } from '@/lib/config';

type SitemapEvent = { id: string; tenantCode: string; updatedAt: string };
type SitemapPage = { tenantCode: string; slug: string; updatedAt: string };

let lastSuccessfulEvents: SitemapEvent[] = [];
let lastSuccessfulPages: SitemapPage[] = [];

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

async function fetchSitemapPages(): Promise<SitemapPage[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-pages`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`sitemap-pages returned ${res.status}`);
    const pages = (await res.json()) as SitemapPage[];
    lastSuccessfulPages = pages;
    return pages;
  } catch (error) {
    if (lastSuccessfulPages.length > 0) {
      console.warn('[sitemap] using cached pages after API failure', error);
    }
    return lastSuccessfulPages;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, pages] = await Promise.all([
    fetchSitemapEvents(),
    fetchSitemapPages(),
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

  const cmsPages: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${SITE_URL}/clubs/${p.tenantCode}/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : STATIC_LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cmsPages, ...eventPages];
}
