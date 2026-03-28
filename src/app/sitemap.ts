import type { MetadataRoute } from 'next';

// In production, flash IDs would come from database/CMS
const flashIds = [
  'btc-95k', 'eth-etf-options', 'uni-v4', 'japan-fsa', 'sol-tps',
  'mstr-btc', 'base-arb', 'tether-q1', 'opensea-free', 'mica-phase2',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://hashspring.com';
  const locales = ['en', 'zh'];
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [];

  // Homepage per locale
  for (const locale of locales) {
    pages.push({
      url: `${baseUrl}/${locale}`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 1.0,
    });
  }

  // Flash detail pages
  for (const locale of locales) {
    for (const id of flashIds) {
      pages.push({
        url: `${baseUrl}/${locale}/flash/${id}`,
        lastModified: now,
        changeFrequency: 'hourly',
        priority: 0.8,
      });
    }
  }

  return pages;
}
