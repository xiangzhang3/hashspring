import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'Googlebot-News',
        allow: '/',
      },
    ],
    sitemap: 'https://hashspring.com/sitemap.xml',
  };
}
