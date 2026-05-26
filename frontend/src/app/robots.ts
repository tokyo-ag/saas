import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comiu.jp'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/e/', '/use-cases/', '/pricing', '/sports/'],
      disallow: [
        '/admin/',
        '/liff/',
        '/superadmin/',
        '/login',
        '/register',
        '/auth/',
        '/forgot-password',
        '/reset-password',
        '/impersonate',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
