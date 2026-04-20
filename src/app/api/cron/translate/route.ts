/**
 * Auto-translate cron endpoint
 *
 * Finds flash_news and articles with missing EN/FIL translations
 * and translates them using Claude API.
 *
 * Can be called:
 * - Via Vercel cron (daily)
 * - Manually: POST /api/cron/translate
 * - After fetch-news completes
 *
 * Limits: translates up to 20 items per run to stay within API limits.
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

const BATCH_LIMIT = 40; // max items per cron run (increased for faster catch-up)
const TRANSLATE_BATCH = 10; // items per Claude API call (Haiku handles larger batches well)

interface TranslateResult {
  id: string;
  title: string;
  content: string;
}

async function callClaude(items: TranslateResult[], targetLang: string): Promise<TranslateResult[]> {
  const langName = targetLang === 'en' ? 'English' : 'Filipino (Tagalog)';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: `You are a professional crypto/blockchain translator. Translate Chinese to ${langName}. Keep crypto terms in English. Keep HTML tags intact. Return ONLY a valid JSON array, no markdown fences.`,
      messages: [{
        role: 'user',
        content: `Translate these items to ${langName}. Return JSON array: [{"id":"...","title":"translated","content":"translated"}]\n\nInput:\n${JSON.stringify(items)}`,
      }],
    }),
  });

  const data = await res.json();
  let text = data.content?.[0]?.text || '[]';
  text = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text);
}

async function supabaseGet(table: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.ok ? res.json() : [];
}

async function supabasePatch(table: string, matchCol: string, matchVal: string, data: Record<string, string>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${encodeURIComponent(matchVal)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
}

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return handleTranslate();
}

export async function POST(request: NextRequest) {
  if (CRON_SECRET) {
    const apiKey = request.headers.get('x-api-key') || '';
    const auth = request.headers.get('authorization');
    if (apiKey !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return handleTranslate();
}

async function handleTranslate() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  const stats = { flash_en: 0, flash_fil: 0, article_en: 0, article_fil: 0, errors: 0 };

  try {
    // ── 1. Flash news needing EN translation ──
    const flashNeedEn: any[] = await supabaseGet('flash_news', {
      select: 'id,content_hash,title,title_zh,body_zh,description',
      'title_en': 'is.null',
      order: 'pub_date.desc',
      limit: String(BATCH_LIMIT),
    });

    if (flashNeedEn.length > 0) {
      for (let i = 0; i < flashNeedEn.length; i += TRANSLATE_BATCH) {
        const batch = flashNeedEn.slice(i, i + TRANSLATE_BATCH);
        const items = batch.map((r: any) => ({
          id: String(r.id),
          title: r.title || r.title_zh || '',
          content: (r.body_zh || r.description || '').slice(0, 1500),
        }));

        try {
          const en = await callClaude(items, 'en');
          for (let j = 0; j < batch.length; j++) {
            const translated = en[j];
            if (translated) {
              await supabasePatch('flash_news', 'id', String(batch[j].id), {
                title_en: translated.title,
                body_en: translated.content,
              });
              stats.flash_en++;
            }
          }
        } catch (e) {
          console.error('[Translate] Flash EN batch error:', e);
          stats.errors++;
        }
      }
    }

    // ── 2. Flash news needing FIL translation ──
    const flashNeedFil: any[] = await supabaseGet('flash_news', {
      select: 'id,content_hash,title,title_en,title_zh,body_en,body_zh',
      'title_fil': 'is.null',
      'title_en': 'not.is.null',
      order: 'pub_date.desc',
      limit: String(BATCH_LIMIT),
    });

    if (flashNeedFil.length > 0) {
      for (let i = 0; i < flashNeedFil.length; i += TRANSLATE_BATCH) {
        const batch = flashNeedFil.slice(i, i + TRANSLATE_BATCH);
        const items = batch.map((r: any) => ({
          id: String(r.id),
          title: r.title || r.title_zh || '',
          content: (r.body_zh || r.body_en || '').slice(0, 1500),
        }));

        try {
          const fil = await callClaude(items, 'fil');
          for (let j = 0; j < batch.length; j++) {
            const translated = fil[j];
            if (translated) {
              await supabasePatch('flash_news', 'id', String(batch[j].id), {
                title_fil: translated.title,
                body_fil: translated.content,
              });
              stats.flash_fil++;
            }
          }
        } catch (e) {
          console.error('[Translate] Flash FIL batch error:', e);
          stats.errors++;
        }
      }
    }

    // ── 3. Articles needing EN translation ──
    const articlesNeedEn: any[] = await supabaseGet('articles', {
      select: 'id,slug,title,excerpt,content',
      'is_published': 'eq.true',
      'title_en': 'is.null',
      order: 'published_at.desc',
      limit: String(BATCH_LIMIT),
    });

    if (articlesNeedEn.length > 0) {
      for (let i = 0; i < articlesNeedEn.length; i += TRANSLATE_BATCH) {
        const batch = articlesNeedEn.slice(i, i + TRANSLATE_BATCH);
        const items = batch.map((a: any) => ({
          id: String(a.id),
          title: a.title || '',
          content: (a.excerpt || (a.content || '').slice(0, 1500)),
        }));

        try {
          const en = await callClaude(items, 'en');
          for (let j = 0; j < batch.length; j++) {
            const translated = en[j];
            if (translated) {
              await supabasePatch('articles', 'id', String(batch[j].id), {
                title_en: translated.title,
                excerpt_en: translated.content,
              });
              stats.article_en++;
            }
          }
        } catch (e) {
          console.error('[Translate] Article EN batch error:', e);
          stats.errors++;
        }
      }
    }

    // ── 4. Articles needing FIL translation ──
    const articlesNeedFil: any[] = await supabaseGet('articles', {
      select: 'id,slug,title,title_en,excerpt,excerpt_en',
      'is_published': 'eq.true',
      'title_fil': 'is.null',
      'title_en': 'not.is.null',
      order: 'published_at.desc',
      limit: String(BATCH_LIMIT),
    });

    if (articlesNeedFil.length > 0) {
      for (let i = 0; i < articlesNeedFil.length; i += TRANSLATE_BATCH) {
        const batch = articlesNeedFil.slice(i, i + TRANSLATE_BATCH);
        const items = batch.map((a: any) => ({
          id: String(a.id),
          title: a.title || '',
          content: (a.excerpt || a.excerpt_en || '').slice(0, 1500),
        }));

        try {
          const fil = await callClaude(items, 'fil');
          for (let j = 0; j < batch.length; j++) {
            const translated = fil[j];
            if (translated) {
              await supabasePatch('articles', 'id', String(batch[j].id), {
                title_fil: translated.title,
                excerpt_fil: translated.content,
              });
              stats.article_fil++;
            }
          }
        } catch (e) {
          console.error('[Translate] Article FIL batch error:', e);
          stats.errors++;
        }
      }
    }

    console.log('[Translate] Done:', stats);
    return NextResponse.json({
      message: 'Translation cron complete',
      stats,
      remaining: {
        flash_en: flashNeedEn.length - stats.flash_en,
        flash_fil: flashNeedFil.length - stats.flash_fil,
        article_en: articlesNeedEn.length - stats.article_en,
        article_fil: articlesNeedFil.length - stats.article_fil,
      },
    });
  } catch (e) {
    console.error('[Translate] Fatal error:', e);
    return NextResponse.json({ error: 'Translation failed', stats }, { status: 500 });
  }
}
