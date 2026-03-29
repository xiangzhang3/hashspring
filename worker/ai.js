/**
 * AI 处理模块 — 翻译 + 分析 + 评论
 *
 * 使用 Anthropic Claude Haiku 进行：
 * 1. 英文 ↔ 繁体中文互译
 * 2. 新闻分析（影响评估）
 * 3. 编辑点评（HashSpring 风格评论）
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(system, userMsg, maxTokens = 2048) {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn(`    ⚠️ Claude API ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch (err) {
    console.warn(`    ⚠️ Claude API 错误: ${err.message}`);
    return null;
  }
}

// ─── 翻译 ───────────────────────────────────────────────────

/**
 * 批量翻译标题
 * @param {string[]} titles - 标题列表
 * @param {'zh'|'en'} targetLang - 目标语言
 * @returns {Object} 索引 → 翻译结果的映射
 */
export async function aiTranslate(titles, targetLang) {
  if (!ANTHROPIC_API_KEY || titles.length === 0) return {};

  const BATCH_SIZE = 15; // 每批翻译 15 条
  const result = {};

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((t, idx) => `${idx + 1}. ${t}`).join('\n');

    const system = targetLang === 'zh'
      ? `你是 HashSpring 的專業新聞翻譯。將英文加密貨幣新聞標題翻譯為繁體中文（台灣用語）。
規則：
- 必須輸出繁體中文
- 保留專有名詞：DeFi, ETF, BTC, ETH, NFT, L2 等
- 保留品牌名（不翻譯）：LBank, Binance, Coinbase, Uniswap, OKX, Bybit, Bitget 等
- 保留數字、日期、百分比
- 用專業新聞語言，簡潔有力
- 只輸出翻譯結果，不要解釋`
      : `You are a professional crypto news translator for HashSpring.
Rules:
- Translate Chinese headlines to English
- Keep crypto terms: DeFi, ETF, BTC, ETH, NFT, L2, TVL, DEX, etc.
- Keep brand names exactly as-is: LBank, Binance, Coinbase, Uniswap, OKX, Bybit, Bitget, etc.
- Keep ticker symbols: $BTC, $ETH, $SOL
- Preserve numbers, dates, percentages
- Use professional news tone
- Output ONLY the translation, no explanations`;

    const prompt = targetLang === 'zh'
      ? `翻譯以下加密貨幣新聞標題為繁體中文，保持編號格式：\n\n${numbered}`
      : `Translate these Chinese crypto news headlines to English. Return numbered list:\n\n${numbered}`;

    const text = await callClaude(system, prompt);
    if (!text) continue;

    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        const batchIdx = parseInt(match[1]) - 1;
        const globalIdx = i + batchIdx;
        result[globalIdx] = match[2].trim();
      }
    }

    // Rate limit: 小延迟避免 API 过载
    if (i + BATCH_SIZE < titles.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return result;
}

// ─── 分析 ───────────────────────────────────────────────────

/**
 * 批量分析新闻影响
 * @param {Array} items - 新闻列表 [{title, source, description}]
 * @returns {Object} 索引 → 分析文字的映射
 */
export async function aiAnalyze(items) {
  if (!ANTHROPIC_API_KEY || items.length === 0) return {};

  const BATCH_SIZE = 10;
  const result = {};

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((item, idx) =>
      `${idx + 1}. [${item.source}] ${item.title}`
    ).join('\n');

    const system = `你是 HashSpring 的資深加密貨幣分析師。對每條新聞給出簡短的市場影響分析。
要求：
- 每條分析 1-2 句話，不超過 50 字
- 用繁體中文
- 判斷對市場是利多、利空、還是中性
- 提及可能受影響的代幣
- 格式：編號. [利多/利空/中性] 分析內容`;

    const text = await callClaude(system,
      `分析以下加密貨幣新聞的市場影響：\n\n${numbered}`,
      1500
    );

    if (!text) continue;

    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        const batchIdx = parseInt(match[1]) - 1;
        const globalIdx = i + batchIdx;
        result[globalIdx] = match[2].trim();
      }
    }

    if (i + BATCH_SIZE < items.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return result;
}

// ─── 文章正文生成 ─────────────────────────────────────────────

/**
 * 为每条新闻生成完整的文章正文（3段，约300-500字）
 * 存入 Supabase 的 body_zh / body_en 字段
 * @param {Array} items - [{title, source, description, link}]
 * @returns {Object} 索引 → { body_zh, body_en } 的映射
 */
export async function aiGenerateBody(items) {
  if (!ANTHROPIC_API_KEY || items.length === 0) return {};

  const BATCH_SIZE = 5;
  const result = {};

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // 逐条生成（每条需要独立的高质量正文）
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const globalIdx = i + j;
      const desc = item.description?.slice(0, 500) || '';
      const source = item.source || '';
      const title = item.title || '';
      const link = item.link || '';

      // 生成中文正文
      const zhBody = await callClaude(
        `你是 HashSpring 的資深加密貨幣新聞編輯。根據新聞標題和描述，撰寫一篇完整的繁體中文快訊文章正文。
要求：
- 輸出3段正文，總字數 300-500 字
- 第1段：核心事件（誰做了什麼，發生了什麼）
- 第2段：關鍵細節、數據、背景信息
- 第3段：市場影響、行業意義或後續展望
- 用繁體中文（台灣用語），專業新聞語言
- 品牌名保持原文不翻譯：LBank, Binance, Coinbase, OKX, Bybit, Bitget, Uniswap 等
- 保留所有數字、代幣名稱、百分比
- 不要重複標題
- 不要添加任何標題、編號、前綴
- 不要寫 "根據報導" 或 "據悉" 之類的開頭
- 直接輸出3段正文，段與段之間用空行分隔
- 最後一行必須是：原文來源：${source}（${link}）`,
        `新聞標題：${title}\n描述：${desc}\n來源：${source}`,
        1200
      );

      // 生成英文正文
      const enBody = await callClaude(
        `You are a senior crypto news editor at HashSpring. Based on the headline and description, write a complete flash news article body.
Requirements:
- Write exactly 3 paragraphs, 200-400 words total
- Paragraph 1: Core event (what happened, who is involved)
- Paragraph 2: Key details, data points, background context
- Paragraph 3: Market impact, industry significance, or outlook
- Professional news language, concise and informative
- Keep all brand names as-is: LBank, Binance, Coinbase, OKX, Bybit, Bitget, Uniswap, etc.
- Keep all numbers, token names, percentages
- Do NOT repeat the headline
- No titles, numbering, or prefixes
- Do NOT start with "According to reports" or similar
- Output 3 paragraphs separated by blank lines
- Last line MUST be: Source: ${source} (${link})`,
        `Headline: ${title}\nDescription: ${desc}\nSource: ${source}`,
        1000
      );

      result[globalIdx] = {
        body_zh: zhBody || `${desc}\n\n原文來源：${source}（${link}）`,
        body_en: enBody || `${desc}\n\nSource: ${source} (${link})`,
      };

      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return result;
}

// ─── 点评 ───────────────────────────────────────────────────

/**
 * 为重点新闻生成编辑点评
 * @param {Array} items - 新闻列表 [{title, source, description}]
 * @returns {Object} 索引 → 点评文字的映射
 */
export async function aiComment(items) {
  if (!ANTHROPIC_API_KEY || items.length === 0) return {};

  const BATCH_SIZE = 5;
  const result = {};

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((item, idx) =>
      `${idx + 1}. [${item.source}] ${item.title}\n   ${item.description?.slice(0, 200) || ''}`
    ).join('\n\n');

    const system = `你是 HashSpring 的主編，為重要加密貨幣新聞撰寫犀利的編輯點評。
風格：
- 每條點評 2-3 句話，80-120 字
- 用繁體中文，台灣用語
- 有觀點、有深度，不是簡單複述
- 可以適當引用數據或歷史事件對比
- 語氣專業但不刻板，像資深幣圈觀察者
- 格式：編號. 點評內容`;

    const text = await callClaude(system,
      `為以下加密貨幣新聞撰寫編輯點評：\n\n${numbered}`,
      2000
    );

    if (!text) continue;

    const lines = text.split('\n').filter(l => l.trim());
    let currentIdx = -1;
    let currentComment = '';

    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        // Save previous
        if (currentIdx >= 0) {
          result[i + currentIdx] = currentComment.trim();
        }
        currentIdx = parseInt(match[1]) - 1;
        currentComment = match[2];
      } else if (currentIdx >= 0) {
        currentComment += ' ' + line.trim();
      }
    }
    // Save last
    if (currentIdx >= 0) {
      result[i + currentIdx] = currentComment.trim();
    }

    if (i + BATCH_SIZE < items.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return result;
}
