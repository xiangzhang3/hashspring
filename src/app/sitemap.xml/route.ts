import { NextResponse } from 'next/server';
import sitemap from '../sitemap';
import { getFlashSitemapItems } from '@/lib/server/flash-news';
import { escapeXml } from '@/lib/server/news-sitemap';
export const revalidate = 60;
export async function GET() {
  const pages = await sitemap({ id: 0 });
  pages.push(...await sitemap({ id: 1 }));
  let source = 'unavailable';
  try {
    const feed = await getFlashSitemapItems();
    source = feed.source;
    for (const item of feed.items) {
      for (const locale of ['en', 'zh', 'fil']) pages.push({
        url: `https://www.hashspring.com/${locale}/flash/${encodeURIComponent(item.id)}`,
        ...(item.publishedAt && Number.isFinite(Date.parse(item.publishedAt)) ? { lastModified: new Date(item.publishedAt) } : {}),
        changeFrequency: 'weekly', priority: 0.7,
      });
    }
  } catch { /* Static pages remain valid; response identifies missing dynamic data. */ }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url><loc>${escapeXml(page.url)}</loc>${page.lastModified ? `<lastmod>${new Date(page.lastModified).toISOString()}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new NextResponse(xml, { headers: {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    'X-Source': source,
  } });
}
