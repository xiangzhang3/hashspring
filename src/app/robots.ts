import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Main crawlers — allow everything except API and admin
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
      // Google News bot — full access for news indexing
      {
        userAgent: 'Googlebot-News',
        allow: '/',
      },
      // Google main bot — explicit allow for key sections
      {
        userAgent: 'Googlebot',
        allow: ['/', '/en/', '/zh/', '/en/flash/', '/zh/flash/', '/en/flashnews', '/zh/flashnews', '/en/market', '/zh/market', '/en/analysis', '/zh/analysis'],
        disallow: ['/api/', '/admin/'],
      },
      // Bing
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // Baidu — important for Chinese SEO
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // Block AI training bots (protect original content)
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
    ],
    sitemap: 'https://hashspring.com/sitemap.xml',
  };
}
