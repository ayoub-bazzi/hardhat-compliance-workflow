import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/how-it-works',
          '/pricing',
          '/blog',
          '/blog/',
          '/about',
          '/contact',
        ],
        disallow: [
          '/gc/',
          '/subcontractor/',
          '/api/',
          '/login',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://hardhat-compliance.app/sitemap.xml',
  }
}
