import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/ayarlar/', '/profile/*/edit'],
      },
    ],
    sitemap: 'https://www.literaslab.com/sitemap.xml',
    host: 'https://www.literaslab.com',
  }
}
