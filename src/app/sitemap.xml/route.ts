import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const staticPages = [
    { url: 'https://www.hashspring.com/en', priority: '1.0', changefreq: 'hourly' },
    { url: 'https://www.hashspring.com/zh', priority: '1.0', changefreq: 'hourly' },
    { url: 'https://www.hashspring.com/en/flashnews', priority: '0.9', changefreq: 'hourly' },
    { url: 'https://www.hashspring.com/zh/flashnews', priority: '0.9', changefreq: 'hourly' },
    { url: 'https://www.hashspring.com/en/market', priority: '0.8', changefreq: 'daily' },
    { url: 'https://www.hashspring.com/zh/market', priority: '0.8', changefreq: 'daily' },
    { url: 'https://www.hashspring.com/en/analysis', priority: '0.8', changefreq: 'daily' },
    { url: 'https://www.hashspring.com/zh/analysis', priority: '0.8', changefreq: 'daily' },
    { url: 'https://www.hashspring.com/en/about', priority: '0.5', changefreq: 'monthly' },
    { url: 'https://www.hashspring.com/zh/about', priority: '0.5', changefreq: 'monthly' },
  ];

  // Fetch recent flash news from Supabase
  let dynamicPages: Array<{ url: string; lastmod: string; priority: string; changefreq: string }> = [];
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/flash_news?select=content_hash,pub_date,title_en&order=pub_date.desc&limit=200',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const rows = await res.json();
      for (const row of rows) {
        const hash = row.content_hash;
        const lastmod = row.pub_date ? new Date(row.pub_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        dynamicPages.push({ url: 'https://www.hashspring.com/en/flash/' + encodeURIComponent(hash), lastmod, priority: '0.7', changefreq: 'weekly' });
        dynamicPages.push({ url: 'https://www.hashspring.com/zh/flash/' + encodeURIComponent(hash), lastmod, priority: '0.7', changefreq: 'weekly' });
      }
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch flash news', e);
  }

  // Category pages
  const categories = ['bitcoin', 'ethereum', 'defi', 'nft', 'solana', 'regulation', 'exchange', 'ai', 'layer-2', 'stablecoin', 'meme'];
  for (const cat of categories) {
    dynamicPages.push({ url: 'https://www.hashspring.com/en/category/' + cat, lastmod: new Date().toISOString().split('T')[0], priority: '0.6', changefreq: 'daily' });
    dynamicPages.push({ url: 'https://www.hashspring.com/zh/category/' + cat, lastmod: new Date().toISOString().split('T')[0], priority: '0.6', changefreq: 'daily' });
  }

  const allPages = [...staticPages.map(p => ({ ...p, lastmod: new Date().toISOString().split('T')[0] })), ...dynamicPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
