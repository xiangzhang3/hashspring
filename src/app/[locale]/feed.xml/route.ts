import type { Locale } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';

export const revalidate = 60;

export async function GET(request: Request, { params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const baseUrl = 'https://hashspring.com';

  // Fetch live data instead of mock data
  let items: FlashItem[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/flash-news?locale=${locale}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      items = await res.json();
    }
  } catch {
    // fallback empty
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <channel>
    <title>HashSpring — Crypto Intelligence (${locale.toUpperCase()})</title>
    <link>${baseUrl}/${locale}</link>
    <description>${locale === 'zh' ? '即時加密貨幣快訊與市場情報' : 'Real-time crypto flash news and market intelligence'}</description>
    <language>${locale === 'zh' ? 'zh-TW' : 'en'}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/${locale}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${baseUrl}/${locale}/flash/${item.id}</link>
      <guid isPermaLink="true">${baseUrl}/${locale}/flash/${item.id}</guid>
      <category>${escapeXml(item.category)}</category>
      <source url="${baseUrl}">${escapeXml(item.source || 'HashSpring')}</source>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
