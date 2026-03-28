/**
 * Article Summary API
 *
 * Given an article URL, fetches the original content and uses AI to
 * generate a 3-paragraph summary (under 400 words).
 *
 * If the original is under 400 words, returns it as-is.
 * If AI is not configured (no ANTHROPIC_API_KEY), returns the raw extract.
 *
 * GET /api/article-summary?url=https://...&locale=en|zh
 */
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 3600; // 1 hour cache

// ─── Simple HTML text extraction ───
function extractTextFromHTML(html: string): string {
  // Remove script, style, nav, footer, header, aside
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '');

  // Try to find article or main content
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  const contentDiv = html.match(/<div[^>]*class="[^"]*(?:article|content|post|entry|story)[^"]*"[\s\S]*?<\/div>/i);

  if (articleMatch) text = articleMatch[0];
  else if (mainMatch) text = mainMatch[0];
  else if (contentDiv) text = contentDiv[0];

  // Strip all tags and clean up
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Fetch original article content ───
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HashSpringBot/1.0; +https://hashspring.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return '';

    const html = await res.text();
    return extractTextFromHTML(html);
  } catch {
    return '';
  }
}

// ─── AI Summary Generation ───
async function generateAISummary(
  content: string,
  title: string,
  locale: string,
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No AI available — split raw content into 3 parts
    return splitIntoThreeParagraphs(content);
  }

  const isZh = locale === 'zh';
  const wordCount = content.split(/\s+/).length;
  const charCount = content.length;

  // If short enough, return as-is (split into paragraphs)
  if ((isZh && charCount <= 400) || (!isZh && wordCount <= 400)) {
    return splitIntoThreeParagraphs(content);
  }

  try {
    const systemPrompt = isZh
      ? `你是 HashSpring 的新闻编辑。请将以下新闻原文提炼为3段摘要，总字数控制在400字以内。
要求：
- 第1段：核心事件概述（谁做了什么）
- 第2段：关键细节和数据
- 第3段：市场影响或后续展望
- 用简洁专业的新闻语言
- 不要添加任何标题、编号或前缀
- 直接输出3段文字，每段用换行分隔`
      : `You are a HashSpring news editor. Summarize the following article into exactly 3 paragraphs, under 400 words total.
Requirements:
- Paragraph 1: Core event summary (who did what)
- Paragraph 2: Key details and data points
- Paragraph 3: Market impact or outlook
- Use concise, professional news language
- No titles, numbering, or prefixes
- Output 3 paragraphs separated by blank lines`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Title: ${title}\n\nOriginal article:\n${content.slice(0, 3000)}`,
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn('AI summary API error:', res.status);
      return splitIntoThreeParagraphs(content);
    }

    const data = await res.json();
    const aiText = data.content?.[0]?.text || '';

    if (!aiText) return splitIntoThreeParagraphs(content);

    // Split AI output into paragraphs
    const paragraphs = aiText
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    if (paragraphs.length >= 2) {
      return paragraphs.slice(0, 3);
    }

    return splitIntoThreeParagraphs(aiText);
  } catch (error) {
    console.warn('AI summary error:', error);
    return splitIntoThreeParagraphs(content);
  }
}

// ─── Fallback: split text into 3 paragraphs ───
function splitIntoThreeParagraphs(text: string): string[] {
  // Trim to ~400 words / 400 chars
  const words = text.split(/\s+/);
  const trimmed = words.length > 400 ? words.slice(0, 400).join(' ') + '...' : text;

  const sentences = trimmed.split(/(?<=[.!?。！？])\s+/);
  if (sentences.length < 3) {
    return [trimmed];
  }

  const third = Math.ceil(sentences.length / 3);
  return [
    sentences.slice(0, third).join(' '),
    sentences.slice(third, third * 2).join(' '),
    sentences.slice(third * 2).join(' '),
  ].filter(p => p.length > 0);
}

// ─── Main handler ───
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const locale = request.nextUrl.searchParams.get('locale') || 'en';
  const title = request.nextUrl.searchParams.get('title') || '';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // 1. Fetch original article
    const rawContent = await fetchArticleContent(url);

    if (!rawContent || rawContent.length < 50) {
      return NextResponse.json({
        paragraphs: [],
        source: 'unavailable',
        message: 'Could not extract article content',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=300' },
      });
    }

    // 2. AI summary
    const paragraphs = await generateAISummary(rawContent, title, locale);

    return NextResponse.json({
      paragraphs,
      source: 'ai',
      wordCount: rawContent.split(/\s+/).length,
      charCount: rawContent.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Article summary error:', error);
    return NextResponse.json({
      paragraphs: [],
      source: 'error',
      message: 'Failed to generate summary',
    }, { status: 500 });
  }
}
