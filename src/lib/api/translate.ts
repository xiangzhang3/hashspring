/**
 * HashSpring AI Translation Pipeline
 * Uses Anthropic Claude API for EN ↔ Traditional Chinese translation
 *
 * Setup: Set ANTHROPIC_API_KEY in your .env.local file
 * Usage: Called by the news fetching pipeline (scripts/fetch-news.ts)
 */

interface TranslationResult {
  translatedTitle: string;
  translatedContent: string;
  locale: string;
}

interface TranslationBatchResult {
  translations: TranslationResult[];
  errors: string[];
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Translate a single piece of content using Claude API
 */
export async function translateContent(
  title: string,
  content: string,
  targetLocale: 'en' | 'zh',
): Promise<TranslationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in environment variables');
  }

  const targetLang = targetLocale === 'zh' ? 'Traditional Chinese (繁體中文)' : 'English';
  const sourceLang = targetLocale === 'zh' ? 'English' : 'Traditional Chinese';

  const systemPrompt = `You are a professional crypto news translator. Translate the following ${sourceLang} crypto news article into ${targetLang}.

Rules:
- Maintain crypto terminology accuracy (e.g., DeFi, TVL, ETF remain in English)
- Use Traditional Chinese characters (繁體), NOT Simplified Chinese (简体)
- Preserve numeric values, ticker symbols, and proper nouns
- Keep the tone professional and news-like
- Output ONLY the translation, no explanations

Return JSON format:
{"translatedTitle": "...", "translatedContent": "..."}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Title: ${title}\n\nContent: ${content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    const parsed = JSON.parse(text);
    return {
      translatedTitle: parsed.translatedTitle,
      translatedContent: parsed.translatedContent,
      locale: targetLocale,
    };
  } catch {
    // If JSON parsing fails, try to extract from text
    return {
      translatedTitle: title,
      translatedContent: text,
      locale: targetLocale,
    };
  }
}

/**
 * Batch translate multiple articles
 * Processes in parallel with rate limiting (max 5 concurrent)
 */
export async function translateBatch(
  articles: Array<{ title: string; content: string }>,
  targetLocale: 'en' | 'zh',
): Promise<TranslationBatchResult> {
  const results: TranslationResult[] = [];
  const errors: string[] = [];
  const concurrency = 5;

  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    const promises = batch.map(async (article, idx) => {
      try {
        const result = await translateContent(article.title, article.content, targetLocale);
        return { success: true as const, result, index: i + idx };
      } catch (err) {
        return { success: false as const, error: `Article ${i + idx}: ${err}`, index: i + idx };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      if (r.success) {
        results.push(r.result);
      } else {
        errors.push(r.error);
      }
    }

    // Rate limit: wait 1s between batches
    if (i + concurrency < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { translations: results, errors };
}

/**
 * Translate a flash news title (lightweight, title-only)
 */
export async function translateFlashTitle(
  title: string,
  targetLocale: 'en' | 'zh',
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return title; // Graceful fallback

  const targetLang = targetLocale === 'zh' ? 'Traditional Chinese (繁體中文)' : 'English';

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `Translate this crypto news headline to ${targetLang}. Use Traditional Chinese (繁體) if target is Chinese. Output ONLY the translation.`,
        messages: [{ role: 'user', content: title }],
      }),
    });

    if (!response.ok) return title;
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || title;
  } catch {
    return title;
  }
}
