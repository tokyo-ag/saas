import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/e/', '/clubs/', '/use-cases/', '/pricing', '/sports/'],
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
