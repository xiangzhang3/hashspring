import type { MetadataRoute } from 'next';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const BASE_URL = 'https://www.hashspring.com';
const LOCALES = ['en', 'zh', 'fil'];

/**
 * Sitemap index — splits into 4 sitemaps:
 *   /sitemap/0.xml  →  static + category pages (~80 URLs)
 *   /sitemap/1.xml  →  analysis articles (~3000 URLs per 1000 articles × 3 locales)
 *   /sitemap/2.xml  →  flash news batch 1 (first 500 × 3 = 1500 URLs)
 *   /sitemap/3.xml  →  flash news batch 2 (next 500 × 3 = 1500 URLs)
 *
 * Google recommends max 50,000 URLs / 50MB per sitemap.
 */
export async function generateSitemaps() {
  // 0 = static, 1 = articles, 2 = flash batch 1, 3 = flash batch 2
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
}

async function supaFetch<T>(query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function localized(path: string, lastModified: Date, changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'], priority: number): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}${path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        en: `${BASE_URL}/en${path}`,
        zh: `${BASE_URL}/zh${path}`,
        fil: `${BASE_URL}/fil${path}`,
      },
    },
  }));
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

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Sitemap 0: Static + Category pages ──
  if (id === 0) {
    const pages: MetadataRoute.Sitemap = [];

    const staticPages = [
      { path: '', priority: 1.0, freq: 'always' as const },
      { path: '/flashnews', priority: 0.9, freq: 'always' as const },
      { path: '/market', priority: 0.9, freq: 'hourly' as const },
      { path: '/trending', priority: 0.85, freq: 'hourly' as const },
      { path: '/analysis', priority: 0.8, freq: 'daily' as const },
      { path: '/about', priority: 0.5, freq: 'monthly' as const },
      { path: '/search', priority: 0.4, freq: 'weekly' as const },
    ];

    for (const page of staticPages) {
      pages.push(...localized(page.path, now, page.freq, page.priority));
    }

    const categories = [
      'bitcoin', 'ethereum', 'defi', 'nft', 'regulation', 'exchange',
      'solana', 'stablecoin', 'ai', 'l2', 'meme', 'rwa', 'gaming', 'policy',
    ];
    for (const slug of categories) {
      pages.push(...localized(`/category/${slug}`, now, 'daily', 0.6));
    }

    return pages;
  }

  // ── Sitemap 1: Analysis articles ──
  if (id === 1) {
    const rows = await supaFetch<{ slug: string; published_at: string }>(
      'articles?select=slug,published_at&is_published=eq.true&order=published_at.desc&limit=2000',
    );
    const pages: MetadataRoute.Sitemap = [];
    for (const row of rows) {
      const pubDate = row.published_at ? new Date(row.published_at) : now;
      pages.push(...localized(`/analysis/${row.slug}`, pubDate, 'weekly', 0.75));
    }
    return pages;
  }

  // ── Sitemap 2: Flash news (batch 1, first 500) ──
  if (id === 2) {
    const rows = await supaFetch<{ content_hash: string; title_en: string; pub_date: string }>(
      'flash_news?select=content_hash,title_en,pub_date&order=pub_date.desc&limit=500&offset=0',
    );
    const pages: MetadataRoute.Sitemap = [];
    for (const row of rows) {
      const slug = generateSeoSlug(row.title_en || '', row.content_hash || '');
      const pubDate = row.pub_date ? new Date(row.pub_date) : now;
      pages.push(...localized(`/flash/${slug}`, pubDate, 'weekly', 0.7));
    }
    return pages;
  }

  // ── Sitemap 3: Flash news (batch 2, 500-1000) ──
  if (id === 3) {
    const rows = await supaFetch<{ content_hash: string; title_en: string; pub_date: string }>(
      'flash_news?select=content_hash,title_en,pub_date&order=pub_date.desc&limit=500&offset=500',
    );
    const pages: MetadataRoute.Sitemap = [];
    for (const row of rows) {
      const slug = generateSeoSlug(row.title_en || '', row.content_hash || '');
      const pubDate = row.pub_date ? new Date(row.pub_date) : now;
      pages.push(...localized(`/flash/${slug}`, pubDate, 'weekly', 0.7));
    }
    return pages;
  }

  return [];
}
