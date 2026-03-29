/**
 * 一次性脚本：清理数据库中日报交易所的单条旧数据
 *
 * 双重匹配：
 * 1. source 字段匹配日报交易所名
 * 2. 标题内容包含交易所名 + 上市/listing 关键词
 *
 * 日报汇总的标题包含 "Daily Digest" / "每日匯總" / "每日摘要" → 保留
 *
 * 用法: node worker/cleanup-exchange-items.js
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// 日报交易所名称（小写用于匹配）
const DIGEST_ONLY_NAMES = [
  'bitget', 'lbank', 'kucoin', 'mexc', 'gate.io', 'htx', 'huobi',
  'coinbase', 'bybit', 'upbit', 'bithumb', 'hyperliquid', 'aster',
];

function isDigestTitle(title) {
  return /daily\s*digest|每日[匯汇]總|每日摘要/i.test(title || '');
}

function isExchangeListingItem(title, source) {
  const t = (title || '').toLowerCase();
  const s = (source || '').toLowerCase();

  // source 字段直接匹配
  if (DIGEST_ONLY_NAMES.some(name => s === name)) return true;

  // 标题包含交易所名 + 上市/listing 关键词
  const hasExchangeName = DIGEST_ONLY_NAMES.some(name => t.includes(name));
  const hasListingKeyword = /上[市线線]|登[陆陸]|首[发發]|listing|delist|将上线|已上线|新增|兑换|convert|perpetual|合约|期货/i.test(title || '');

  return hasExchangeName && hasListingKeyword;
}

async function supabaseQuery(params) {
  const url = `${SUPABASE_URL}/rest/v1/flash_news?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase query failed: ${res.status}`);
  return res.json();
}

async function supabaseDelete(contentHash) {
  const url = `${SUPABASE_URL}/rest/v1/flash_news?content_hash=eq.${encodeURIComponent(contentHash)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
  });
  return res.ok;
}

async function main() {
  console.log('🧹 开始清理日报交易所的单条旧数据...\n');
  console.log('匹配策略：source 字段 + 标题内容双重匹配\n');

  // 分批查询所有记录
  let offset = 0;
  const PAGE = 500;
  let totalScanned = 0;
  let totalDeleted = 0;
  let totalKept = 0;
  const deletedSamples = [];

  while (true) {
    const rows = await supabaseQuery({
      select: 'content_hash,title,title_zh,source,pub_date',
      order: 'pub_date.desc',
      limit: String(PAGE),
      offset: String(offset),
    });

    if (!rows || rows.length === 0) break;
    totalScanned += rows.length;
    console.log(`  📄 扫描第 ${offset + 1} - ${offset + rows.length} 条...`);

    for (const row of rows) {
      const title = row.title || row.title_zh || '';
      const source = row.source || '';

      // 跳过日报汇总
      if (isDigestTitle(title) || isDigestTitle(row.title_zh)) {
        totalKept++;
        continue;
      }

      // 检查是否需要删除
      if (isExchangeListingItem(title, source) || isExchangeListingItem(row.title_zh, source)) {
        const ok = await supabaseDelete(row.content_hash);
        if (ok) {
          totalDeleted++;
          if (deletedSamples.length < 10) {
            deletedSamples.push(`  🗑️ [${source}] ${title.slice(0, 50)}`);
          }
        }
      }
    }

    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ 清理完成！`);
  console.log(`   扫描: ${totalScanned} 条`);
  console.log(`   删除: ${totalDeleted} 条`);
  console.log(`   日报保留: ${totalKept} 条`);

  if (deletedSamples.length > 0) {
    console.log(`\n示例删除记录:`);
    deletedSamples.forEach(s => console.log(s));
  }
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
