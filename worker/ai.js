/**
 * AI 处理模块 v2 — 更稳定的逐条处理方案
 *
 * 核心改进：
 * 1. 翻译保持批量（高效），但分析/点评/正文合并为单次调用（减少 API 次数）
 * 2. 每条新闻只调 1 次 Claude → 同时返回翻译 + 分析 + 点评 + 中英正文
 * 3. 自动重试（最多2次）+ 超时30s + 失败降级（返回空值不阻塞）
 * 4. 新增 aiProcessSingle()：一次调用完成单条新闻的全部 AI 内容
 * 5. 新增 aiFillEmpty()：专门回填数据库中 analysis/comment/body 为空的记录
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

// ─── 全局速率限制器（防止 429） ─────────────────────────────
let lastCallTime = 0;
const MIN_CALL_GAP_MS = 12000; // 每次 Claude 调用至少间隔 12 秒（≈5次/分钟）

async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_CALL_GAP_MS) {
    const wait = MIN_CALL_GAP_MS - elapsed;
    await new Promise(r => setTimeout(r, wait));
  }
  lastCallTime = Date.now();
}

// ─── 基础调用 + 重试 ────────────────────────────────────────
async function callClaude(system, userMsg, maxTokens = 2048, retries = 2) {
  if (!ANTHROPIC_API_KEY) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await waitForRateLimit(); // 全局速率限制
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

      if (res.status === 429) {
        // Rate limited → 等待后重试
        const wait = Math.min(5000 * (attempt + 1), 15000);
        console.warn(`    ⏳ Claude 429 rate limited, ${wait / 1000}s 后重试 (${attempt + 1}/${retries + 1})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (res.status === 529 || res.status >= 500) {
        // 服务端错误 → 重试
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        console.warn(`    ⚠️ Claude API ${res.status} 持续失败，跳过`);
        return null;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => ''); console.warn(`    ⚠️ Claude API ${res.status}: ${res.statusText} — ${errBody.slice(0, 200)}`);
        return null;
      }

      const data = await res.json();
      return data.content?.[0]?.text || null;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`    ⚠️ Claude 调用失败 (${attempt + 1}/${retries + 1}): ${err.message}，重试...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      console.warn(`    ⚠️ Claude API 最终失败: ${err.message}`);
      return null;
    }
  }
  return null;
}

// ─── 批量翻译（保留，高效且稳定） ─────────────────────────────

/**
 * 批量翻译标题
 * @param {string[]} titles - 标题列表
 * @param {'zh'|'en'} targetLang - 目标语言
 * @returns {Object} 索引 → 翻译结果的映射
 */
export async function aiTranslate(titles, targetLang) {
  if (!ANTHROPIC_API_KEY || titles.length === 0) return {};

  const BATCH_SIZE = 15;
  const result = {};

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((t, idx) => `${idx + 1}. ${t}`).join('\n');

    const system = targetLang === 'zh'
      ? `你是專業加密貨幣新聞翻譯。將英文標題翻譯為繁體中文（台灣用語）。保留專有名詞和品牌名。只輸出翻譯，保持編號格式。重要：標題末尾不要加句號。`
      : `Professional crypto news translator. Translate Chinese headlines to English. Keep all crypto terms, brand names, ticker symbols. Output numbered list only. IMPORTANT: Do NOT add periods at the end of titles.`;

    const prompt = targetLang === 'zh'
      ? `翻譯以下標題為繁體中文：\n\n${numbered}`
      : `Translate to English:\n\n${numbered}`;

    const text = await callClaude(system, prompt, 1500);
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

    // 批间间隔由全局 waitForRateLimit() 在 callClaude 内部控制
  }

  return result;
}

// ─── 核心：单条新闻一次性 AI 全处理 ─────────────────────────

/**
 * 一次 Claude 调用，同时生成：分析 + 点评 + 中文正文 + 英文正文
 * 比原来4次独立调用减少75%的 API 请求
 *
 * @param {Object} item - { title, source, description, link, title_en, title_zh }
 * @returns {{ analysis, comment, body_zh, body_en } | null}
 */
export async function aiProcessSingle(item) {
  if (!ANTHROPIC_API_KEY) return null;

  const title = item.title || '';
  const source = item.source || '';
  const desc = (item.description || '').slice(0, 500);
  const link = item.link || '';
  const titleEn = item.title_en || title;
  const titleZh = item.title_zh || title;

  const system = `你是 HashSpring 加密貨幣新聞平台的 AI 編輯。根據新聞標題和描述，一次性輸出以下4個區塊，用 === 分隔。

你必須嚴格按照以下格式輸出，不要添加任何其他內容：

===ANALYSIS===
用繁體中文寫1-2句市場影響分析（30-50字）。判斷利多/利空/中性，提及受影響代幣。

===COMMENT===
用繁體中文寫2-3句編輯點評（80-120字）。要有觀點和深度，像資深幣圈觀察者。

===BODY_ZH===
用繁體中文寫3段正文（300-500字）。
第1段：核心事件。第2段：關鍵細節和背景。第3段：市場影響和展望。
品牌名保持原文。不要重複標題。不要寫"根據報導"開頭。

===BODY_EN===
Write 3 paragraphs in English (200-400 words).
Para 1: Core event. Para 2: Key details and context. Para 3: Market impact and outlook.
Keep brand names as-is. Don't repeat headline. Don't start with "According to".

規則：
- 保留專有名詞：DeFi, ETF, BTC, ETH, NFT, L2 等
- 保留品牌名不翻譯
- 保留數字、百分比
- 專業新聞語言`;

  const prompt = `新聞標題（EN）：${titleEn}
新聞標題（ZH）：${titleZh}
描述：${desc}
來源：${source}
連結：${link}`;

  const text = await callClaude(system, prompt, 3000);
  if (!text) return null;

  // 解析4个区块（支持 === 分隔符前后有空格、换行等不规范格式）
  const result = { analysis: null, comment: null, body_zh: null, body_en: null };

  try {
    // 主解析：按 === 标记切割
    const analysisMatch = text.match(/={2,}ANALYSIS={2,}\s*([\s\S]*?)(?=={2,}[A-Z]|$)/i);
    const commentMatch = text.match(/={2,}COMMENT={2,}\s*([\s\S]*?)(?=={2,}[A-Z]|$)/i);
    const bodyZhMatch = text.match(/={2,}BODY_ZH={2,}\s*([\s\S]*?)(?=={2,}[A-Z]|$)/i);
    const bodyEnMatch = text.match(/={2,}BODY_EN={2,}\s*([\s\S]*?)$/i);

    if (analysisMatch) result.analysis = analysisMatch[1].trim();
    if (commentMatch) result.comment = commentMatch[1].trim();
    if (bodyZhMatch) result.body_zh = bodyZhMatch[1].trim();
    if (bodyEnMatch) result.body_en = bodyEnMatch[1].trim();

    // 降级解析：如果完全没匹配到分隔符，把整段文本当作 body_zh（至少不浪费 API 调用）
    if (!result.analysis && !result.comment && !result.body_zh && !result.body_en) {
      const cleaned = text.trim();
      if (cleaned.length > 50) {
        // 检测是否以中文开头
        const isChinese = /[\u4e00-\u9fff]/.test(cleaned.charAt(0));
        if (isChinese) {
          result.body_zh = cleaned;
          result.analysis = cleaned.split(/[。！？\n]/)[0]?.trim() || null;
        } else {
          result.body_en = cleaned;
          result.analysis = cleaned.split(/[.\n]/)[0]?.trim() || null;
        }
        console.warn(`    ⚠️ AI 输出无分隔符，降级为整段正文 (${cleaned.length} 字)`);
      }
    }

    // 补充来源归属
    if (result.body_zh && link) {
      result.body_zh += `\n\n原文來源：${source}（${link}）`;
    }
    if (result.body_en && link) {
      result.body_en += `\n\nSource: ${source} (${link})`;
    }

    // 最终校验：清理掉可能残留的分隔符
    for (const key of ['analysis', 'comment', 'body_zh', 'body_en']) {
      if (result[key]) {
        result[key] = result[key].replace(/={2,}[A-Z_]+={2,}/g, '').trim();
      }
    }
  } catch (parseErr) {
    console.warn(`    ⚠️ AI 输出解析失败: ${parseErr.message}`);
    // 不返回 null，尝试保存原始文本
    if (text.length > 50) {
      result.body_zh = text.trim();
    }
  }

  return result;
}

// ─── 批量处理（逐条调 aiProcessSingle，带并发控制） ──────────

/**
 * 批量处理多条新闻的 AI 内容（分析 + 点评 + 正文）
 * 并发2条同时处理，比串行快2倍，比全并发安全
 *
 * @param {Array} items - 新闻列表
 * @returns {{ analyses: Object, comments: Object, bodies: Object }}
 */
export async function aiProcessBatch(items) {
  if (!ANTHROPIC_API_KEY || items.length === 0) {
    return { analyses: {}, comments: {}, bodies: {} };
  }

  const analyses = {};
  const comments = {};
  const bodies = {};

  // 串行处理，每轮最多 2 条（Haiku 免费 tier 限流极严格，≈5次/分钟）
  const CONCURRENCY = 1;
  const maxItems = Math.min(items.length, 2);

  for (let i = 0; i < maxItems; i += CONCURRENCY) {
    const batch = [];
    for (let j = i; j < Math.min(i + CONCURRENCY, maxItems); j++) {
      batch.push({ idx: j, item: items[j] });
    }

    const results = await Promise.allSettled(
      batch.map(({ item }) => aiProcessSingle(item))
    );

    for (let k = 0; k < results.length; k++) {
      const idx = batch[k].idx;
      const res = results[k];

      if (res.status === 'fulfilled' && res.value) {
        const v = res.value;
        if (v.analysis) analyses[idx] = v.analysis;
        if (v.comment) comments[idx] = v.comment;
        if (v.body_zh || v.body_en) {
          bodies[idx] = { body_zh: v.body_zh, body_en: v.body_en };
        }
      }
    }

    // 批间间隔由全局 waitForRateLimit() 控制，无需额外等待
  }

  const total = Object.keys(analyses).length;
  console.log(`    📊 AI 处理完成: ${total}/${maxItems} 条成功`);

  return { analyses, comments, bodies };
}

// ─── 回填空值（定期扫描数据库中缺失 AI 内容的记录） ──────────

/**
 * 扫描最近24小时内 analysis/comment/body 为空的记录，补充 AI 内容
 * 每次最多回填 10 条，避免 API 过载
 *
 * @param {Object} supabaseClient - Supabase 客户端实例
 * @returns {number} 成功回填的条数
 */
export async function aiFillEmpty(supabaseClient) {
  if (!ANTHROPIC_API_KEY) return 0;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 查找缺失 AI 内容的记录（优先 red/orange 级别）
  const { data: emptyItems, error } = await supabaseClient
    .from('flash_news')
    .select('content_hash, title, title_en, title_zh, description, source, link, level')
    .gte('pub_date', twentyFourHoursAgo)
    .or('analysis.is.null,comment.is.null,body_en.is.null,body_zh.is.null')
    .order('level', { ascending: true }) // red 先处理
    .limit(2); // 每次最多回填2条，防止 429

  if (error || !emptyItems || emptyItems.length === 0) {
    return 0;
  }

  console.log(`  🔄 AI 回填: 发现 ${emptyItems.length} 条缺失 AI 内容`);

  let filled = 0;

  for (const item of emptyItems) {
    const aiResult = await aiProcessSingle(item);
    if (!aiResult) continue;

    // 只更新非空的字段（不覆盖已有内容）
    const updates = {};
    if (aiResult.analysis) updates.analysis = aiResult.analysis;
    if (aiResult.comment) updates.comment = aiResult.comment;
    if (aiResult.body_zh) updates.body_zh = aiResult.body_zh;
    if (aiResult.body_en) updates.body_en = aiResult.body_en;

    if (Object.keys(updates).length === 0) continue;

    const { error: updateErr } = await supabaseClient
      .from('flash_news')
      .update(updates)
      .eq('content_hash', item.content_hash);

    if (!updateErr) {
      filled++;
    } else {
      console.warn(`    ⚠️ 回填失败 ${item.content_hash}: ${updateErr.message}`);
    }

    // Rate limit — 由全局 waitForRateLimit() 在 callClaude 内部控制
  }

  if (filled > 0) {
    console.log(`  ✅ AI 回填完成: ${filled}/${emptyItems.length} 条`);
  }

  return filled;
}

// ─── 兼容旧接口（保留导出，内部走新逻辑） ────────────────────

export async function aiAnalyze(items) {
  const { analyses } = await aiProcessBatch(items);
  return analyses;
}

export async function aiComment(items) {
  const { comments } = await aiProcessBatch(items);
  return comments;
}

export async function aiGenerateBody(items) {
  const { bodies } = await aiProcessBatch(items);
  return bodies;
}
