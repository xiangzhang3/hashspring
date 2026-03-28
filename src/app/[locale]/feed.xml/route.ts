import { getFlashItems } from '@/lib/mock-data';
import type { Locale } from '@/lib/i18n';

export async function GET(request: Request, { params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const items = getFlashItems(locale);
  const baseUrl = 'https://hashspring.com';

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <channel>
    <title>HashSpring — Crypto Intelligence (${locale.toUpperCase()})</title>
    <link>${baseUrl}/${locale}</link>
    <description>Real-time crypto flash news and market intelligence</description>
    <language>${locale === 'zh' ? 'zh-CN' : 'en'}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/${locale}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${baseUrl}/${locale}/flash/${item.id}</link>
      <guid isPermaLink="true">${baseUrl}/${locale}/flash/${item.id}</guid>
      <category>${escapeXml(item.category)}</category>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
