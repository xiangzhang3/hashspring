import { NextResponse } from 'next/server';

export const revalidate = 300; // 5 min cache

export async function GET() {
  const baseUrl = 'https://hashspring.com';
  let flashItems: Array<{ id: string; title: string; category: string; time: string; source?: string }> = [];

  // Fetch latest flash news for the news sitemap
  try {
    // Use internal URL in production, absolute URL otherwise
    const apiUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/flash-news?locale=en`
      : `${baseUrl}/api/flash-news?locale=en`;

    const res = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        flashItems = data.slice(0, 50);
      }
    }
  } catch {
    // Fallback: empty items
  }

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${flashItems.map((item) => `  <url>
    <loc>${baseUrl}/en/flash/${encodeURIComponent(item.id)}</loc>
    <news:news>
      <news:publication>
        <news:name>HashSpring</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${now}</news:publication_date>
      <news:title>${escapeXml(item.title)}</news:title>
      <news:keywords>${escapeXml(item.category)}, crypto, blockchain</news:keywords>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
