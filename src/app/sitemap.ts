import type { MetadataRoute } from 'next';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Dynamic sitemap: fetches real flash news slugs from Supabase
 * so Google can discover and index every article page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hashspring.com';
  const locales = ['en', 'zh'];
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [];

  // ── Static pages ──
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'always' as const },
    { path: '/flashnews', priority: 0.9, changeFrequency: 'always' as const },
    { path: '/market', priority: 0.9, changeFrequency: 'hourly' as const },
    { path: '/trending', priority: 0.85, changeFrequency: 'hourly' as const },
    { path: '/analysis', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  for (const locale of locales) {
    for (const page of staticPages) {
      pages.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page.path}`,
            zh: `${baseUrl}/zh${page.path}`,
          },
        },
      });
    }
  }

  // ── Dynamic flash news pages from Supabase ──
  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/flash_news?select=content_hash,title_en,pub_date&order=pub_date.desc&limit=500`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          next: { revalidate: 600 }, // 10 min cache
        }
      );

      if (res.ok) {
        const rows: Array<{ content_hash: string; title_en: string; pub_date: string }> = await res.json();
        for (const row of rows) {
          const slug = generateSeoSlug(row.title_en || '', row.content_hash || '');
          const pubDate = row.pub_date ? new Date(row.pub_date) : now;
          for (const locale of locales) {
            pages.push({
              url: `${baseUrl}/${locale}/flash/${slug}`,
              lastModified: pubDate,
              changeFrequency: 'weekly',
              priority: 0.7,
              alternates: {
                languages: {
                  en: `${baseUrl}/en/flash/${slug}`,
                  zh: `${baseUrl}/zh/flash/${slug}`,
                },
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Sitemap: failed to fetch flash news from Supabase', e);
  }

  // ── Category pages ──
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
        alternates: {
          languages: {
            en: `${baseUrl}/en/category/${slug}`,
            zh: `${baseUrl}/zh/category/${slug}`,
          },
        },
      });
    }
  }

  // ── Analysis articles from articles table ──
  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/articles?select=slug,published_at&is_published=eq.true&order=published_at.desc&limit=2000`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          next: { revalidate: 600 },
        }
      );
      if (res.ok) {
        const rows: Array<{ slug: string; published_at: string }> = await res.json();
        for (const row of rows) {
          const pubDate = row.published_at ? new Date(row.published_at) : now;
          for (const locale of locales) {
            pages.push({
              url: `${baseUrl}/${locale}/analysis/${row.slug}`,
              lastModified: pubDate,
              changeFrequency: 'weekly',
              priority: 0.75,
              alternates: {
                languages: {
                  en: `${baseUrl}/en/analysis/${row.slug}`,
                  zh: `${baseUrl}/zh/analysis/${row.slug}`,
                },
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Sitemap: failed to fetch articles from Supabase', e);
  }

  return pages;
}

function generateSeoSlug(title: string, hashId: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\$([a-z0-9]+)/g, '$1')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const shortHash = hashId.replace(/^h/, '').slice(0, 8);
  return slug ? `${slug}-${shortHash}` : hashId;
}
