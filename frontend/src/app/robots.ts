import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://comiu.jp'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/liff/', '/superadmin/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
