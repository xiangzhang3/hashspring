/**
 * HashSpring Local Worker
 *
 * 每 1 分钟自动抓取 35+ 内容源，AI 翻译 + 分析 + 评论，写入 Supabase
 *
 * 使用: cd worker && npm install && npm start
 * 单次运行: npm run once
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

async function runCycle() {
  cycleCount++;
  const start = Date.now();
  console.log(`\n🔄 [Cycle ${cycleCount}] ${new Date().toLocaleString()} — 开始抓取...`);

  try {
    // 1. 抓取所有源
    const rawItems = await fetchAllSources();
    console.log(`  📥 抓取到 ${rawItems.length} 条原始内容`);

    if (rawItems.length === 0) {
      console.log('  ⚠️  没有抓到内容，跳过');
      return;
    }

    // 2. 查询已有的 hash，避免重复写入
    const hashes = rawItems.map(item => contentHash(item.title, item.source));
    const { data: existing } = await supabase
      .from('flash_news')
      .select('content_hash')
      .in('content_hash', hashes);

    const existingSet = new Set((existing || []).map(e => e.content_hash));
    const newItems = rawItems.filter(item => !existingSet.has(contentHash(item.title, item.source)));

    console.log(`  🆕 ${newItems.length} 条新内容（${rawItems.length - newItems.length} 条已存在）`);

    if (newItems.length === 0) {
      console.log(`  ✅ 无新内容，耗时 ${Date.now() - start}ms`);
      return;
    }

    // 3. AI 翻译（英文 ↔ 中文互译）
    const enItems = newItems.filter(item => !/[\u4e00-\u9fff]/.test(item.title));
    const zhItems = newItems.filter(item => /[\u4e00-\u9fff]/.test(item.title));

    let zhTranslations = {};
    let enTranslations = {};

    if (enItems.length > 0) {
      console.log(`  🌐 翻译 ${enItems.length} 条英文 → 繁体中文...`);
      zhTranslations = await aiTranslate(enItems.map(i => i.title), 'zh');
    }
    if (zhItems.length > 0) {
      console.log(`  🌐 翻译 ${zhItems.length} 条中文 → 英文...`);
      enTranslations = await aiTranslate(zhItems.map(i => i.title), 'en');
    }

    // 4. AI 分析 + 评论（批量处理）
    console.log(`  🤖 AI 分析 ${newItems.length} 条内容...`);
    const analyses = await aiAnalyze(newItems.slice(0, 20)); // 限制 20 条，避免 API 超限
    const comments = await aiComment(newItems.slice(0, 10)); // 限制 10 条重点评论

    // 5. 构建数据库记录
    const records = newItems.map((item, idx) => {
      const hash = contentHash(item.title, item.source);
      const isEn = !/[\u4e00-\u9fff]/.test(item.title);

      return {
        content_hash: hash,
        title_en: isEn ? item.title : (enTranslations[idx] || item.title),
        title_zh: isEn ? (zhTranslations[idx] || item.title) : item.title,
        description: item.description || '',
        link: item.link || '',
        source: item.source || '',
        source_type: item.sourceType || 'rss',
        category: classifyCategory(item.title),
        level: classifyLevel(item.title),
        published_at: item.pubDate || new Date().toISOString(),
        ai_analysis: analyses[idx] || null,
        ai_comment: comments[idx] || null,
        lang: isEn ? 'en' : 'zh',
      };
    });

    // 6. 写入 Supabase
    const { error } = await supabase
      .from('flash_news')
      .upsert(records, { onConflict: 'content_hash' });

    if (error) {
      console.error('  ❌ Supabase 写入失败:', error.message);
    } else {
      console.log(`  ✅ 写入 ${records.length} 条到数据库，耗时 ${Date.now() - start}ms`);
    }

  } catch (err) {
    console.error('  ❌ Cycle 错误:', err.message);
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
console.log('🚀 HashSpring Worker 启动');
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   抓取间隔: ${FETCH_INTERVAL / 1000}s`);
console.log(`   AI: ${process.env.ANTHROPIC_API_KEY ? '✅ 已配置' : '⚠️ 未配置（跳过翻译/分析）'}`);
console.log('');

// Run immediately
await runCycle();

if (!ONCE) {
  console.log(`\n⏱️  每 ${FETCH_INTERVAL / 1000} 秒自动运行...（Ctrl+C 停止）`);
  setInterval(runCycle, FETCH_INTERVAL);
}
