import type { MetadataRoute } from 'next';

import { SITE_URL, API_URL } from '@/lib/config';

type SitemapEvent = { id: string; tenantCode: string; updatedAt: string };
type SitemapPage = { tenantCode: string; slug: string; updatedAt: string };
type SitemapBlogPost = { tenantCode: string; slug: string; updatedAt: string };
type SitemapOfficialArticle = { slug: string; updatedAt: string };

let lastSuccessfulEvents: SitemapEvent[] = [];
let lastSuccessfulPages: SitemapPage[] = [];
let lastSuccessfulBlogPosts: SitemapBlogPost[] = [];
let lastSuccessfulOfficialArticles: SitemapOfficialArticle[] = [];

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

async function fetchSitemapBlogPosts(): Promise<SitemapBlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-blog-posts`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`sitemap-blog-posts returned ${res.status}`);
    const posts = (await res.json()) as SitemapBlogPost[];
    lastSuccessfulBlogPosts = posts;
    return posts;
  } catch (error) {
    if (lastSuccessfulBlogPosts.length > 0) {
      console.warn('[sitemap] using cached blog posts after API failure', error);
    }
    return lastSuccessfulBlogPosts;
  }
}

async function fetchSitemapOfficialArticles(): Promise<SitemapOfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/sitemap-official-articles`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`sitemap-official-articles returned ${res.status}`);
    const articles = (await res.json()) as SitemapOfficialArticle[];
    lastSuccessfulOfficialArticles = articles;
    return articles;
  } catch (error) {
    if (lastSuccessfulOfficialArticles.length > 0) {
      console.warn('[sitemap] using cached official articles after API failure', error);
    }
    return lastSuccessfulOfficialArticles;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, pages, blogPosts, officialArticles] = await Promise.all([
    fetchSitemapEvents(),
    fetchSitemapPages(),
    fetchSitemapBlogPosts(),
    fetchSitemapOfficialArticles(),
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
    { url: `${SITE_URL}/organizers`, changeFrequency: 'weekly', priority: 0.9, lastModified: STATIC_LAST_MODIFIED },
    { url: `${SITE_URL}/guide`, changeFrequency: 'weekly', priority: 0.8, lastModified: STATIC_LAST_MODIFIED },
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

  const blogIndexByTenant = new Map<string, Date>();
  for (const post of blogPosts) {
    const updatedAt = post.updatedAt ? new Date(post.updatedAt) : STATIC_LAST_MODIFIED;
    const current = blogIndexByTenant.get(post.tenantCode);
    if (!current || updatedAt > current) {
      blogIndexByTenant.set(post.tenantCode, updatedAt);
    }
  }

  const blogIndexPages: MetadataRoute.Sitemap = Array.from(blogIndexByTenant.entries()).map(([tenantCode, lastModified]) => ({
    url: `${SITE_URL}/clubs/${tenantCode}/blog`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.65,
  }));

  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/clubs/${post.tenantCode}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : STATIC_LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const officialArticlePages: MetadataRoute.Sitemap = officialArticles.map((article) => ({
    url: `${SITE_URL}/guide/${article.slug}`,
    lastModified: article.updatedAt ? new Date(article.updatedAt) : STATIC_LAST_MODIFIED,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  return [...staticPages, ...officialArticlePages, ...cmsPages, ...blogIndexPages, ...blogPostPages, ...eventPages];
}
