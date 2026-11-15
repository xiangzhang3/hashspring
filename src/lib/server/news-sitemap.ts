import type { FlashItem } from '@/components/FlashFeed';
export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
export function newsSitemapXml(items: FlashItem[], now = Date.now()): string {
  const entries = items.filter(item => {
    const timestamp = Date.parse(item.publishedAt || '');
    return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - 2 * 86400000;
  }).slice(0, 333).flatMap(item => ['en', 'zh', 'fil'].map(lang => `  <url>
    <loc>https://www.hashspring.com/${lang}/flash/${encodeURIComponent(item.id)}</loc>
    <news:news>
      <news:publication><news:name>HashSpring</news:name><news:language>${lang}</news:language></news:publication>
      <news:publication_date>${new Date(item.publishedAt!).toISOString()}</news:publication_date>
      <news:title>${escapeXml(item.title)}</news:title>
    </news:news>
  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>`;
}
