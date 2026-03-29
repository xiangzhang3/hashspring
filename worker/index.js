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
import { fetchAllSources } from './sources.js';
import { aiTranslate, aiAnalyze, aiComment } from './ai.js';

// ─── Config ─────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FETCH_INTERVAL = parseInt(process.env.FETCH_INTERVAL || '60', 10) * 1000;
const ONCE = process.argv.includes('--once');

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

    const newItems = recentItems.filter(item => !existingSet.has(contentHash(item.title, item.source)));

    console.log(`  🆕 ${newItems.length} 条新内容（${recentItems.length - newItems.length} 条已存在）`);

    if (newItems.length === 0) {
      errorTracker.consecutive = 0; // 重置，因为流程正常只是没新内容
      console.log(`  ✅ 无新内容，耗时 ${Date.now() - start}ms`);
      return;
    }

    // 按时间排序：旧→新，先发旧的再发新的
    newItems.sort((a, b) => {
      try {
        return new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime();
      } catch { return 0; }
    });

    // 3. AI 翻译（英文 ↔ 中文互译）
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
      // 翻译失败不阻塞，继续用原标题
    }

    // 4. AI 分析 + 评论
    let analyses = {};
    let comments = {};
    try {
      console.log(`  🤖 AI 分析 ${Math.min(newItems.length, 20)} 条内容...`);
      analyses = await aiAnalyze(newItems.slice(0, 20));
      comments = await aiComment(newItems.slice(0, 10));
    } catch (aiErr) {
      reportError('AI 分析', aiErr.message, '分析/评论失败，使用空值继续');
    }

    // 5. 构建数据库记录
    const records = newItems.map((item, idx) => {
      const hash = contentHash(item.title, item.source);
      const isEn = !/[\u4e00-\u9fff]/.test(item.title);

      // 正文末尾添加原文来源链接
      const sourceAttribution = item.link
        ? `\n\n📰 原文來源：${item.source} | ${item.link}`
        : '';
      const desc = (item.description || '') + sourceAttribution;

      return {
        content_hash: hash,
        title: item.title,
        title_en: isEn ? item.title : (enTranslations[idx] || item.title),
        title_zh: isEn ? (zhTranslations[idx] || item.title) : item.title,
        description: desc,
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
        .upsert(batch, { onConflict: 'content_hash' });

      if (error) {
        writeFail += batch.length;
        reportError('Supabase 写入', error.message, `批次 ${i}-${i + batch.length}，共 ${batch.length} 条`);
      } else {
        writeSuccess += batch.length;
      }
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

// ─── Startup ────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  HashSpring Worker v2.0                          ║');
console.log('║  37+ 源 | AI翻译 | 去重 | 自动发布              ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   抓取间隔: ${FETCH_INTERVAL / 1000}s`);
console.log(`   AI: ${process.env.ANTHROPIC_API_KEY ? '✅ 已配置' : '⚠️ 未配置（跳过翻译/分析）'}`);
console.log(`   OpenNews: ${process.env.OPENNEWS_TOKEN ? '✅ 已配置' : '⚠️ 未配置（使用公开接口）'}`);
console.log(`   模式: ${ONCE ? '单次运行' : '持续运行'}`);
console.log('');

// 首轮：补充过去12小时的内容
console.log('📋 首轮运行：补充过去12小时未收录的内容...\n');
await runCycle();

if (!ONCE) {
  console.log(`\n⏱️  每 ${FETCH_INTERVAL / 1000} 秒自动运行...（Ctrl+C 停止）`);
  console.log('   错误会自动检测并在终端报告\n');
  setInterval(runCycle, FETCH_INTERVAL);
}
