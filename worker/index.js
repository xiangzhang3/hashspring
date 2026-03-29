/**
 * HashSpring Local Worker
 *
 * 自动抓取 37+ 内容源，AI 翻译 + 分析 + 评论，写入 Supabase
 * 含错误自动检测 + 12小时内容补充
 *
 * 使用: cd worker && npm install && node index.js
 * 单次运行: node index.js --once
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchAllSources, fetchRedditCrypto } from './sources.js';
import { aiTranslate, aiProcessBatch, aiFillEmpty } from './ai.js';

// ─── Config ─────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FETCH_INTERVAL = parseInt(process.env.FETCH_INTERVAL || '60', 10) * 1000;
const ONCE = process.argv.includes('--once');

// Telegram 推送配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
const telegramPushed = new Set(); // 已推送的 content_hash，防止重复

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY，请检查 .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── 错误追踪 ───────────────────────────────────────────────
const errorTracker = {
  consecutive: 0,       // 连续失败次数
  lastError: null,
  sourceErrors: {},     // 每个源的失败统计
  totalSuccess: 0,
  totalFail: 0,
};

function reportError(stage, error, context = '') {
  const ts = new Date().toLocaleString('zh-CN', { hour12: false });
  console.error(`\n${'═'.repeat(60)}`);
  console.error(`❌ 错误报告 [${ts}]`);
  console.error(`   阶段: ${stage}`);
  console.error(`   错误: ${error}`);
  if (context) console.error(`   上下文: ${context}`);
  console.error(`   连续失败: ${errorTracker.consecutive} 次`);
  console.error(`${'═'.repeat(60)}\n`);
}

// ─── Deduplication ──────────────────────────────────────────
function contentHash(title, source) {
  const str = `${title.toLowerCase().replace(/\s+/g, '')}:${source}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

// ─── 交易所内容限流 ─────────────────────────────────────────
// Bitget: 4小时内最多1条，优先上线信息
// LBank:  4小时内只推送上线信息，不推送其他
// Binance/OKX/Bybit: 不限流
const RATE_LIMIT_HOURS = 4;
const rateLimitCache = {}; // { source: lastPushTimestamp }

function isListingNews(title) {
  const listingKeywords = [
    /list/i, /上线/i, /launch/i, /new\s+pair/i, /trading\s+pair/i,
    /开通.*交易/i, /open.*trading/i, /will\s+list/i, /spot.*listing/i,
    /perpetual.*listing/i, /futures.*listing/i, /新增.*交易对/i,
    /adds?\s+/i, /now\s+available/i,
  ];
  return listingKeywords.some(re => re.test(title));
}

function isDelistingNews(title) {
  const delistKeywords = [/delist/i, /下架/i, /remove/i, /removal/i, /下线/i];
  return delistKeywords.some(re => re.test(title));
}

function isFunctionalNews(title) {
  const funcKeywords = [
    /maintenance/i, /upgrade/i, /维护/i, /升级/i, /suspend/i, /resume/i,
    /暂停/i, /恢复/i, /deposit/i, /withdraw/i, /充值/i, /提币/i,
    /airdrop/i, /空投/i, /fork/i, /snapshot/i, /快照/i,
  ];
  return funcKeywords.some(re => re.test(title));
}

/**
 * 对限流交易所的内容进行过滤
 * @param {Array} items - 去重后的新内容
 * @returns {Array} - 过滤后的内容
 */
async function applyExchangeRateLimit(items, supabaseClient) {
  const RATE_LIMITED_SOURCES = {
    'Bitget': { maxPerWindow: 1, listingOnly: false },
    'LBank':  { maxPerWindow: 1, listingOnly: true },
  };

  const rateLimitedItems = items.filter(item => item.source in RATE_LIMITED_SOURCES);
  const normalItems = items.filter(item => !(item.source in RATE_LIMITED_SOURCES));

  if (rateLimitedItems.length === 0) return items;

  // 查询过去4小时内已推送的限流源内容
  const fourHoursAgo = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000).toISOString();
  const recentPushed = {};

  for (const source of Object.keys(RATE_LIMITED_SOURCES)) {
    const { data } = await supabaseClient
      .from('flash_news')
      .select('title,pub_date')
      .eq('source', source)
      .gte('pub_date', fourHoursAgo)
      .order('pub_date', { ascending: false });

    recentPushed[source] = data || [];
  }

  const kept = [];
  const skipped = [];

  for (const source of Object.keys(RATE_LIMITED_SOURCES)) {
    const config = RATE_LIMITED_SOURCES[source];
    const sourceItems = rateLimitedItems.filter(item => item.source === source);
    const alreadyPushed = recentPushed[source].length;

    if (sourceItems.length === 0) continue;

    // LBank: 只推送上线信息
    let candidates = sourceItems;
    if (config.listingOnly) {
      candidates = sourceItems.filter(item => isListingNews(item.title));
      const lbankSkipped = sourceItems.filter(item => !isListingNews(item.title));
      skipped.push(...lbankSkipped);
    }

    // 已经在4小时窗口内推送过了 → 检查是否还有配额
    if (alreadyPushed >= config.maxPerWindow) {
      skipped.push(...candidates);
      console.log(`  🚫 ${source}: 4小时内已推送 ${alreadyPushed} 条，跳过 ${candidates.length} 条新内容`);
      continue;
    }

    const slotsLeft = config.maxPerWindow - alreadyPushed;

    // 优先级排序：上线 > 功能性 > 下架 > 其他
    candidates.sort((a, b) => {
      const priority = (item) => {
        if (isListingNews(item.title)) return 0;
        if (isFunctionalNews(item.title)) return 1;
        if (isDelistingNews(item.title)) return 2;
        return 3;
      };
      return priority(a) - priority(b);
    });

    const toKeep = candidates.slice(0, slotsLeft);
    const toSkip = candidates.slice(slotsLeft);
    kept.push(...toKeep);
    skipped.push(...toSkip);

    if (toKeep.length > 0) {
      console.log(`  ✅ ${source}: 推送 ${toKeep.length} 条 (${toKeep.map(i => i.title.slice(0, 30)).join('; ')})`);
    }
    if (toSkip.length > 0) {
      console.log(`  🚫 ${source}: 限流跳过 ${toSkip.length} 条`);
    }
  }

  if (skipped.length > 0) {
    console.log(`  📊 交易所限流: 保留 ${kept.length} 条, 跳过 ${skipped.length} 条`);
  }

  return [...normalItems, ...kept];
}

// ─── Main Fetch Cycle ───────────────────────────────────────
let cycleCount = 0;
let isRunning = false;

async function runCycle() {
  if (isRunning) {
    console.log('  ⏳ 上一轮还在运行，跳过...');
    return;
  }
  isRunning = true;
  cycleCount++;
  const start = Date.now();
  console.log(`\n🔄 [Cycle ${cycleCount}] ${new Date().toLocaleString()} — 开始抓取...`);

  try {
    // 1. 抓取所有源
    const rawItems = await fetchAllSources();
    console.log(`  📥 抓取到 ${rawItems.length} 条原始内容`);

    if (rawItems.length === 0) {
      errorTracker.consecutive++;
      reportError('抓取阶段', '所有源返回0条内容', '网络可能不通或所有源挂了');
      return;
    }

    // 过滤：只保留过去12小时内的内容
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const recentItems = rawItems.filter(item => {
      try {
        const pubTime = new Date(item.pubDate).getTime();
        return pubTime > twelveHoursAgo || isNaN(pubTime); // 无日期的也保留
      } catch {
        return true;
      }
    });
    console.log(`  ⏰ ${recentItems.length} 条在12小时内（过滤掉 ${rawItems.length - recentItems.length} 条旧内容）`);

    // 2. 查询已有的 hash，避免重复写入（分批查询避免 URL 过长）
    const BATCH_QUERY = 50;
    const existingSet = new Set();
    for (let i = 0; i < recentItems.length; i += BATCH_QUERY) {
      const batch = recentItems.slice(i, i + BATCH_QUERY);
      const hashes = batch.map(item => contentHash(item.title, item.source));
      const { data: existing, error: queryErr } = await supabase
        .from('flash_news')
        .select('content_hash')
        .in('content_hash', hashes);

      if (queryErr) {
        reportError('Supabase 查询', queryErr.message, `查询去重 batch ${i}-${i + BATCH_QUERY}`);
        continue;
      }
      (existing || []).forEach(e => existingSet.add(e.content_hash));
    }

    let newItems = recentItems.filter(item => {
      const hash = contentHash(item.title, item.source);
      return !existingSet.has(hash);
    });

    console.log(`  🆕 ${newItems.length} 条新内容（${recentItems.length - newItems.length} 条已存在）`);

    if (newItems.length === 0) {
      errorTracker.consecutive = 0; // 重置，因为流程正常只是没新内容
      console.log(`  ✅ 无新内容，耗时 ${Date.now() - start}ms`);
      return;
    }

    // 2.5 交易所限流（Bitget 4h最多1条优先上线，LBank 只推上线）
    newItems = await applyExchangeRateLimit(newItems, supabase);

    if (newItems.length === 0) {
      errorTracker.consecutive = 0;
      console.log(`  ✅ 限流后无新内容，耗时 ${Date.now() - start}ms`);
      return;
    }

    // 按时间排序：旧→新，先发旧的再发新的
    newItems.sort((a, b) => {
      try {
        return new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime();
      } catch { return 0; }
    });

    // 3. AI 翻译（英文 ↔ 中文互译，批量高效）
    const enItems = newItems.filter(item => !/[\u4e00-\u9fff]/.test(item.title));
    const zhItems = newItems.filter(item => /[\u4e00-\u9fff]/.test(item.title));

    let zhTranslations = {};
    let enTranslations = {};

    try {
      if (enItems.length > 0) {
        console.log(`  🌐 翻译 ${enItems.length} 条英文 → 繁体中文...`);
        zhTranslations = await aiTranslate(enItems.map(i => i.title), 'zh');
      }
      if (zhItems.length > 0) {
        console.log(`  🌐 翻译 ${zhItems.length} 条中文 → 英文...`);
        enTranslations = await aiTranslate(zhItems.map(i => i.title), 'en');
      }
    } catch (aiErr) {
      reportError('AI 翻译', aiErr.message, `尝试翻译 ${enItems.length} 英 + ${zhItems.length} 中`);
    }

    // 4. AI 统一处理：分析 + 点评 + 中英正文（单次调用，替代原来的3次独立调用）
    //    先构建带翻译标题的 items，再统一调 aiProcessBatch
    const itemsForAI = newItems.map((item, idx) => {
      const isEn = !/[\u4e00-\u9fff]/.test(item.title);
      return {
        ...item,
        title_en: isEn ? item.title : (enTranslations[idx] || item.title),
        title_zh: isEn ? (zhTranslations[idx] || item.title) : item.title,
      };
    });

    let analyses = {};
    let comments = {};
    let bodies = {};
    try {
      console.log(`  🤖 AI 全量处理 ${Math.min(newItems.length, 20)} 条（分析+点评+正文）...`);
      const aiResult = await aiProcessBatch(itemsForAI);
      analyses = aiResult.analyses;
      comments = aiResult.comments;
      bodies = aiResult.bodies;
    } catch (aiErr) {
      reportError('AI 处理', aiErr.message, 'AI 全量处理失败，使用空值继续');
    }

    // 5. 构建数据库记录
    const records = newItems.map((item, idx) => {
      const hash = contentHash(item.title, item.source);
      const isEn = !/[\u4e00-\u9fff]/.test(item.title);

      const sourceAttribution = item.link
        ? `\n\n📰 原文來源：${item.source} | ${item.link}`
        : '';
      const desc = (item.description || '') + sourceAttribution;

      const bodyData = bodies[idx] || {};

      return {
        content_hash: hash,
        title: item.title,
        title_en: isEn ? item.title : (enTranslations[idx] || item.title),
        title_zh: isEn ? (zhTranslations[idx] || item.title) : item.title,
        description: desc,
        body_en: bodyData.body_en || null,
        body_zh: bodyData.body_zh || null,
        link: item.link || '',
        source: item.source || '',
        source_type: item.sourceType || 'rss',
        category: classifyCategory(item.title),
        level: classifyLevel(item.title),
        pub_date: item.pubDate || new Date().toISOString(),
        analysis: analyses[idx] || null,
        comment: comments[idx] || null,
        lang: isEn ? 'en' : 'zh',
      };
    });

    // 6. 分批写入 Supabase（每批50条，避免 payload 过大）
    const BATCH_WRITE = 50;
    let writeSuccess = 0;
    let writeFail = 0;

    for (let i = 0; i < records.length; i += BATCH_WRITE) {
      const batch = records.slice(i, i + BATCH_WRITE);
      const { error } = await supabase
        .from('flash_news')
        .upsert(batch, { onConflict: 'content_hash', ignoreDuplicates: true });

      if (error) {
        writeFail += batch.length;
        reportError('Supabase 写入', error.message, `批次 ${i}-${i + batch.length}，共 ${batch.length} 条`);
      } else {
        writeSuccess += batch.length;
      }
    }

    // 7. Telegram 推送（红色/橙色重要快讯立即推送到频道）
    try {
      await pushToTelegram(records);
    } catch (tgErr) {
      console.warn(`  ⚠️ Telegram 推送异常: ${tgErr.message}`);
    }

    const elapsed = Date.now() - start;
    console.log(`  ✅ 写入完成: ${writeSuccess} 成功, ${writeFail} 失败, 耗时 ${elapsed}ms`);

    if (writeFail > 0) {
      errorTracker.consecutive++;
      errorTracker.totalFail += writeFail;
    } else {
      errorTracker.consecutive = 0;
    }
    errorTracker.totalSuccess += writeSuccess;

    // 连续失败报警
    if (errorTracker.consecutive >= 3) {
      console.error(`\n🚨🚨🚨 警告: 已连续 ${errorTracker.consecutive} 轮出错！请检查网络和 API 配置 🚨🚨🚨\n`);
    }

  } catch (err) {
    errorTracker.consecutive++;
    reportError('未知错误', err.message, err.stack?.split('\n')[1]?.trim());
  } finally {
    isRunning = false;
  }
}

// ─── Classification ─────────────────────────────────────────
const BREAKING_KW = ['hack', 'exploit', 'sec', 'etf', 'crash', 'surge', 'emergency', 'ban', 'approve', 'listing', 'delist', '暴跌', '暴涨', '被盗', '紧急', '批准', '上市'];
const IMPORTANT_KW = ['bitcoin', 'ethereum', 'btc', 'eth', 'regulation', 'fed', 'fomc', 'whale', 'airdrop', 'unlock', '比特币', '以太坊', '监管', '巨鲸'];

const CATEGORY_MAP = {
  BTC: ['bitcoin', 'btc', '$btc', '比特币'],
  ETH: ['ethereum', 'eth', '$eth', 'vitalik', '以太坊'],
  SOL: ['solana', 'sol', '$sol'],
  DeFi: ['defi', 'dex', 'tvl', 'aave', 'uniswap', 'lido', 'curve', 'compound'],
  NFT: ['nft', 'opensea', 'blur', 'ordinals', 'brc-20'],
  L2: ['layer 2', 'layer-2', 'l2', 'arbitrum', 'optimism', 'base', 'zksync', 'starknet'],
  Policy: ['sec', 'cftc', 'regulation', 'congress', 'senate', 'law', 'ban', 'policy', '监管', '法规'],
  Stable: ['stablecoin', 'usdt', 'usdc', 'tether', 'circle', 'dai'],
  AI: ['ai ', ' ai', 'artificial intelligence', 'chatgpt', 'openai', 'machine learning'],
  Exchange: ['binance', 'coinbase', 'okx', 'bybit', 'bitget', 'kraken', '交易所'],
  Meme: ['doge', 'shib', 'pepe', 'meme', 'floki', 'bonk', 'wif'],
};

function classifyLevel(title) {
  const lower = title.toLowerCase();
  if (BREAKING_KW.some(kw => lower.includes(kw))) return 'red';
  if (IMPORTANT_KW.some(kw => lower.includes(kw))) return 'orange';
  return 'blue';
}

function classifyCategory(title) {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'Crypto';
}

// ─── Telegram 推送（新重要快讯立即推送到频道） ────────────────
async function pushToTelegram(records) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) return;

  // 只推红色（突发）和橙色（重要）
  const important = records.filter(r =>
    (r.level === 'red' || r.level === 'orange') && !telegramPushed.has(r.content_hash)
  );
  if (important.length === 0) return;

  // 每轮最多推3条，防止刷屏
  const toPush = important.slice(0, 3);
  let pushed = 0;

  for (const item of toPush) {
    const levelLabel = item.level === 'red' ? '🔴 BREAKING | 突發' : '🟠 IMPORTANT | 重要';
    const slug = (item.title_en || item.title || '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
    const shortHash = item.content_hash.replace(/^h/, '').slice(0, 8);
    const seoSlug = slug ? `${slug}-${shortHash}` : item.content_hash;

    const enUrl = `https://hashspring.com/en/flash/${encodeURIComponent(seoSlug)}`;
    const zhUrl = `https://hashspring.com/zh/flash/${encodeURIComponent(seoSlug)}`;
    const tag = `#${(item.category || 'Crypto').replace(/\s+/g, '')} #Crypto`;

    const msg = [
      `${levelLabel} | ${item.category || 'Crypto'}`,
      '',
      `📰 ${item.title_en || item.title}`,
      item.title_zh && item.title_zh !== item.title_en ? `📰 ${item.title_zh}` : '',
      '',
      item.source ? `📌 Source / 來源：${item.source}` : '',
      `🔗 EN: ${enUrl}`,
      `🔗 中文: ${zhUrl}`,
      item.link ? `📎 ${item.link}` : '',
      '',
      tag,
      `— @HashSpringUpdate`,
    ].filter(Boolean).join('\n');

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text: msg,
          disable_web_page_preview: false,
        }),
      });
      if (res.ok) {
        pushed++;
        telegramPushed.add(item.content_hash);
        // 控制缓存大小
        if (telegramPushed.size > 500) {
          const arr = Array.from(telegramPushed);
          for (let i = 0; i < 100; i++) telegramPushed.delete(arr[i]);
        }
      } else {
        const err = await res.text();
        console.warn(`    ⚠️ Telegram 推送失败: ${err.slice(0, 100)}`);
      }
      // Rate limit: 1 msg/sec
      await new Promise(r => setTimeout(r, 1100));
    } catch (e) {
      console.warn(`    ⚠️ Telegram 发送错误: ${e.message}`);
    }
  }

  if (pushed > 0) {
    console.log(`  📢 Telegram 推送 ${pushed} 条到 ${TELEGRAM_CHANNEL_ID}`);
  }
}

// ─── 交易所日报模型（Daily Digest） ──────────────────────────
/**
 * 实时推送的交易所（不做日报汇总）：Binance, OKX, Upbit, Bithumb
 * 日报汇总的交易所：每家独立时间槽，间隔5分钟，错峰推送
 *
 * 时间表（UTC）：
 *   09:00 Bybit
 *   09:05 Bitget
 *   09:10 Coinbase
 *   09:15 Gate.io
 *   09:20 KuCoin
 *   09:25 HTX
 *   09:30 LBank
 *
 * 每家查询前24小时公告，分四类（上架/下架/公告/活动），写入 Supabase + 推 Telegram
 */
const REALTIME_EXCHANGES = new Set(['Binance', 'Binance Alpha', 'Binance Futures', 'OKX', 'Upbit', 'Bithumb']);

// 每家交易所独立调度：{ name, startHour, startMinute }
const DIGEST_SCHEDULE = [
  { name: 'Bybit',    hour: 9, minute: 0  },
  { name: 'Bitget',   hour: 9, minute: 5  },
  { name: 'Coinbase', hour: 9, minute: 10 },
  { name: 'Gate.io',  hour: 9, minute: 15 },
  { name: 'KuCoin',   hour: 9, minute: 20 },
  { name: 'HTX',      hour: 9, minute: 25 },
  { name: 'LBank',    hour: 9, minute: 30 },
];

// 记录每家交易所当天是否已生成日报: { 'Bybit': '2026-03-29', ... }
const digestGeneratedMap = {};

/**
 * 生成单个交易所的日报
 */
async function generateSingleExchangeDigest(exchange, todayStr, nowUTC) {
  console.log(`  📋 生成 ${exchange} 日报 (${todayStr})...`);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentItems, error } = await supabase
    .from('flash_news')
    .select('title, title_en, title_zh, source, link, pub_date, category')
    .eq('source', exchange)
    .gte('pub_date', twentyFourHoursAgo)
    .order('pub_date', { ascending: true });

  if (error) {
    console.warn(`  ⚠️ ${exchange} 日报查询失败: ${error.message}`);
    return;
  }

  if (!recentItems || recentItems.length === 0) {
    console.log(`  ℹ️ ${exchange}: 过去24小时无公告，跳过`);
    return;
  }

  // 分类
  const data = { listings: [], delistings: [], special: [], activities: [] };
  for (const item of recentItems) {
    const t = (item.title || '').toLowerCase();
    if (/list|launch|new\s+(pair|token)|上线|上架|trading\s+pair|spot.*listing|perpetual.*listing|adds?\s+/i.test(t)) {
      data.listings.push(item);
    } else if (/delist|下架|remove|removal|下线/i.test(t)) {
      data.delistings.push(item);
    } else if (/event|campaign|reward|bonus|competition|活动|奖励|赛/i.test(t)) {
      data.activities.push(item);
    } else {
      data.special.push(item);
    }
  }

  const totalCount = data.listings.length + data.delistings.length + data.special.length + data.activities.length;
  if (totalCount === 0) return;

  // 构建内容
  const titleEn = `${exchange} Daily Digest — ${todayStr}`;
  const titleZh = `${exchange} 每日公告匯總 — ${todayStr}`;

  const sections = [];
  const sectionsZh = [];

  if (data.listings.length > 0) {
    sections.push(`📈 New Listings (${data.listings.length}):\n${data.listings.map(i => `  • ${i.title_en || i.title}`).join('\n')}`);
    sectionsZh.push(`📈 新上架 (${data.listings.length}):\n${data.listings.map(i => `  • ${i.title_zh || i.title}`).join('\n')}`);
  }
  if (data.delistings.length > 0) {
    sections.push(`📉 Delistings (${data.delistings.length}):\n${data.delistings.map(i => `  • ${i.title_en || i.title}`).join('\n')}`);
    sectionsZh.push(`📉 下架 (${data.delistings.length}):\n${data.delistings.map(i => `  • ${i.title_zh || i.title}`).join('\n')}`);
  }
  if (data.special.length > 0) {
    sections.push(`📌 Announcements (${data.special.length}):\n${data.special.map(i => `  • ${i.title_en || i.title}`).join('\n')}`);
    sectionsZh.push(`📌 公告 (${data.special.length}):\n${data.special.map(i => `  • ${i.title_zh || i.title}`).join('\n')}`);
  }
  if (data.activities.length > 0) {
    sections.push(`🎯 Events & Activities (${data.activities.length}):\n${data.activities.map(i => `  • ${i.title_en || i.title}`).join('\n')}`);
    sectionsZh.push(`🎯 活動 (${data.activities.length}):\n${data.activities.map(i => `  • ${i.title_zh || i.title}`).join('\n')}`);
  }

  const bodyEn = sections.join('\n\n');
  const bodyZh = sectionsZh.join('\n\n');
  const digestHash = contentHash(`${exchange}-digest-${todayStr}`, 'digest');

  // 写入 Supabase
  const { error: writeErr } = await supabase
    .from('flash_news')
    .upsert({
      content_hash: digestHash,
      title: titleEn,
      title_en: titleEn,
      title_zh: titleZh,
      description: `Daily summary of ${exchange} announcements: ${data.listings.length} listings, ${data.delistings.length} delistings, ${data.special.length} announcements, ${data.activities.length} activities.`,
      body_en: bodyEn,
      body_zh: bodyZh,
      link: '',
      source: `${exchange} Digest`,
      source_type: 'digest',
      category: 'Exchange',
      level: 'blue',
      pub_date: nowUTC.toISOString(),
      analysis: null,
      comment: null,
      lang: 'en',
    }, { onConflict: 'content_hash', ignoreDuplicates: true });

  if (writeErr) {
    console.warn(`  ⚠️ ${exchange} 日报写入失败: ${writeErr.message}`);
  } else {
    console.log(`  ✅ ${exchange} 日报: ${data.listings.length} 上架, ${data.delistings.length} 下架, ${data.special.length} 公告, ${data.activities.length} 活动`);
  }

  // Telegram 推送
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID) {
    const slug = `${exchange.toLowerCase().replace(/[^a-z0-9]/g, '')}-daily-digest-${todayStr}`;
    const shortHash = digestHash.replace(/^h/, '').slice(0, 8);
    const seoSlug = `${slug}-${shortHash}`;

    const tgMsg = [
      `📋 ${exchange} Daily Digest | 每日匯總`,
      `📅 ${todayStr}`,
      '',
      bodyEn.slice(0, 800),
      '',
      `🔗 EN: https://hashspring.com/en/flash/${encodeURIComponent(seoSlug)}`,
      `🔗 中文: https://hashspring.com/zh/flash/${encodeURIComponent(seoSlug)}`,
      '',
      `#${exchange.replace(/[.\s]/g, '')} #ExchangeDigest #Crypto`,
      `— @HashSpringUpdate`,
    ].join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text: tgMsg,
          disable_web_page_preview: true,
        }),
      });
    } catch (e) {
      console.warn(`  ⚠️ ${exchange} 日报 Telegram 推送失败: ${e.message}`);
    }
  }
}

/**
 * 调度器：每轮检查当前 UTC 时间，到了某家交易所的时间槽就生成该家日报
 * 每家每天只生成一次，5分钟间隔错峰推送到 Telegram，不刷屏
 */
async function generateExchangeDigest() {
  const nowUTC = new Date();
  const todayStr = nowUTC.toISOString().slice(0, 10);
  const h = nowUTC.getUTCHours();
  const m = nowUTC.getUTCMinutes();

  for (const slot of DIGEST_SCHEDULE) {
    // 还没到这家的时间
    if (h < slot.hour || (h === slot.hour && m < slot.minute)) continue;

    // 今天已经生成过了
    if (digestGeneratedMap[slot.name] === todayStr) continue;

    // 到点了且今天还没生成 → 执行
    digestGeneratedMap[slot.name] = todayStr;
    await generateSingleExchangeDigest(slot.name, todayStr, nowUTC);

    // 一轮只处理一家，下一家等下一轮 cycle（避免一次推太多）
    break;
  }
}

// ─── Reddit 每日热帖汇编（Top 10） ──────────────────────────
/**
 * 每天 UTC 10:00 汇编 Reddit r/cryptocurrency 热帖 Top 10
 * 按综合热度排序：upvotes + comments * 2 + awards * 10
 */
let lastRedditDigestDate = '';

async function generateRedditDigest() {
  const nowUTC = new Date();
  const todayStr = nowUTC.toISOString().slice(0, 10);

  if (todayStr === lastRedditDigestDate) return;
  if (nowUTC.getUTCHours() < 10) return;

  console.log(`\n📋 [Reddit Daily] 生成 ${todayStr} Reddit 热帖 Top 10...`);
  lastRedditDigestDate = todayStr;

  const posts = await fetchRedditCrypto();
  if (posts.length === 0) {
    console.log(`  ℹ️ Reddit 无法获取数据，跳过`);
    return;
  }

  // 取 Top 10
  const top10 = posts.slice(0, 10);

  const titleEn = `Reddit r/Cryptocurrency Daily Hot — ${todayStr}`;
  const titleZh = `Reddit 加密貨幣每日熱帖 — ${todayStr}`;

  const bodyEn = top10.map((p, i) =>
    `${i + 1}. ${p.title}\n   ⬆️ ${p.upvotes} upvotes | 💬 ${p.comments} comments | by u/${p.author}\n   🔗 ${p.link}`
  ).join('\n\n');

  const bodyZh = top10.map((p, i) =>
    `${i + 1}. ${p.title}\n   ⬆️ ${p.upvotes} 點讚 | 💬 ${p.comments} 評論 | by u/${p.author}\n   🔗 ${p.link}`
  ).join('\n\n');

  const digestHash = contentHash(`reddit-daily-${todayStr}`, 'reddit-digest');

  const { error } = await supabase
    .from('flash_news')
    .upsert({
      content_hash: digestHash,
      title: titleEn,
      title_en: titleEn,
      title_zh: titleZh,
      description: `Daily compilation of top 10 Reddit r/cryptocurrency posts by engagement.`,
      body_en: bodyEn,
      body_zh: bodyZh,
      link: 'https://reddit.com/r/cryptocurrency',
      source: 'Reddit Daily',
      source_type: 'digest',
      category: 'Crypto',
      level: 'blue',
      pub_date: nowUTC.toISOString(),
      analysis: null,
      comment: null,
      lang: 'en',
    }, { onConflict: 'content_hash', ignoreDuplicates: true });

  if (error) {
    console.warn(`  ⚠️ Reddit 日报写入失败: ${error.message}`);
  } else {
    console.log(`  ✅ Reddit Top 10 日报生成完成`);
  }

  // Telegram 推送
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID) {
    const shortList = top10.slice(0, 5).map((p, i) =>
      `${i + 1}. ${p.title.slice(0, 60)}${p.title.length > 60 ? '...' : ''} (⬆️${p.upvotes} 💬${p.comments})`
    ).join('\n');

    const slug = `reddit-cryptocurrency-daily-hot-${todayStr}`;
    const shortHash = digestHash.replace(/^h/, '').slice(0, 8);
    const seoSlug = `${slug}-${shortHash}`;

    const tgMsg = [
      `🔥 Reddit r/Cryptocurrency Daily Hot | 每日熱帖`,
      `📅 ${todayStr}`,
      '',
      `Top 5 Preview:`,
      shortList,
      '',
      `🔗 Full Top 10: https://hashspring.com/en/flash/${encodeURIComponent(seoSlug)}`,
      `🔗 完整榜單: https://hashspring.com/zh/flash/${encodeURIComponent(seoSlug)}`,
      '',
      `#Reddit #Cryptocurrency #DailyHot`,
      `— @HashSpringUpdate`,
    ].join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text: tgMsg,
          disable_web_page_preview: true,
        }),
      });
    } catch (e) {
      console.warn(`  ⚠️ Reddit 日报 Telegram 推送失败: ${e.message}`);
    }
  }
}

// ─── Startup ────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  HashSpring Worker v3.0                          ║');
console.log('║  60+ 源 | AI翻译 | 去重 | 日报 | 自动发布      ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   抓取间隔: ${FETCH_INTERVAL / 1000}s`);
console.log(`   AI: ${process.env.ANTHROPIC_API_KEY ? '✅ 已配置' : '⚠️ 未配置（跳过翻译/分析）'}`);
console.log(`   Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ ' + TELEGRAM_CHANNEL_ID : '⚠️ 未配置（跳过推送）'}`);
console.log(`   OpenNews: ${process.env.OPENNEWS_TOKEN ? '✅ 已配置' : '⚠️ 未配置（使用公开接口）'}`);
console.log(`   模式: ${ONCE ? '单次运行' : '持续运行'}`);
console.log('');

// 首轮：补充过去12小时的内容
console.log('📋 首轮运行：补充过去12小时未收录的内容...\n');
await runCycle();

// 首轮检查日报 + AI 回填
await generateExchangeDigest();
await generateRedditDigest();
await aiFillEmpty(supabase);

if (!ONCE) {
  console.log(`\n⏱️  每 ${FETCH_INTERVAL / 1000} 秒自动运行...（Ctrl+C 停止）`);
  console.log('   含交易所日报（UTC 09:00-09:30）+ Reddit 汇编（UTC 10:00）');
  console.log('   AI 回填每 5 轮执行一次');
  console.log('   错误会自动检测并在终端报告\n');

  let loopCount = 0;
  setInterval(async () => {
    loopCount++;
    await runCycle();
    await generateExchangeDigest();
    await generateRedditDigest();
    // 每 5 轮执行一次 AI 回填（约5分钟一次，补充之前失败的 AI 内容）
    if (loopCount % 5 === 0) {
      try {
        await aiFillEmpty(supabase);
      } catch (e) {
        console.warn(`  ⚠️ AI 回填异常: ${e.message}`);
      }
    }
  }, FETCH_INTERVAL);
}
