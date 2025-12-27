// =============================================================================
// ROBOTS.TXT
// app/robots.ts
// Tells search engines what to crawl
// =============================================================================

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/my-bookings',
        ],
      },
    ],
    sitemap: 'https://www.popndroprentals.com/sitemap.xml',
  };
}
