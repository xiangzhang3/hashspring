import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://hashspring.com';
  const locales = ['en', 'zh'];
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [];

  // Static pages with their priorities and change frequencies
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'always' as const },
    { path: '/flashnews', priority: 0.9, changeFrequency: 'always' as const },
    { path: '/market', priority: 0.9, changeFrequency: 'hourly' as const },
    { path: '/analysis', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  // Generate entries for each locale × page combination
  for (const locale of locales) {
    for (const page of staticPages) {
      pages.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    }
  }

  // Flash detail pages (in production, these IDs would come from database/CMS)
  const flashIds = [
    'btc-95k', 'eth-etf-options', 'uni-v4', 'japan-fsa', 'sol-tps',
    'mstr-btc', 'base-arb', 'tether-q1', 'opensea-free', 'mica-phase2',
  ];

  for (const locale of locales) {
    for (const id of flashIds) {
      pages.push({
        url: `${baseUrl}/${locale}/flash/${id}`,
        lastModified: now,
        changeFrequency: 'hourly',
        priority: 0.7,
      });
    }
  }

  // Category pages
  const categories = [
    'bitcoin', 'ethereum', 'defi', 'nft', 'regulation', 'exchange',
    'solana', 'stablecoin', 'ai', 'l2', 'meme', 'rwa', 'gaming', 'policy',
  ];
  for (const locale of locales) {
    for (const slug of categories) {
      pages.push({
        url: `${baseUrl}/${locale}/category/${slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  }

  return pages;
}
