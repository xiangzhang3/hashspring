/**
 * 一次性脚本：清理数据库中日报交易所的单条旧数据
 *
 * 规则：只有 Binance / OKX 保留单条，其余交易所只保留日报汇总
 * 日报汇总的标题包含 "Daily Digest" / "每日匯總" / "每日摘要"
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

// 日报交易所（这些只保留日报汇总，删除单条）
const DIGEST_ONLY_EXCHANGES = [
  'Bitget', 'LBank', 'KuCoin', 'MEXC', 'Gate.io', 'HTX',
  'Coinbase', 'Bybit', 'Upbit', 'Bithumb', 'Hyperliquid', 'Aster',
];

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

function isDigestTitle(title) {
  return /daily\s*digest|每日[匯汇]總|每日摘要/i.test(title || '');
}

async function main() {
  console.log('🧹 开始清理日报交易所的单条旧数据...\n');

  let totalDeleted = 0;
  let totalKept = 0;

  for (const exchange of DIGEST_ONLY_EXCHANGES) {
    // 查询该交易所的所有记录
    const rows = await supabaseQuery({
      select: 'content_hash,title,title_zh,pub_date,source',
      'source': `eq.${exchange}`,
      order: 'pub_date.desc',
      limit: '500',
    });

    if (!rows || rows.length === 0) {
      console.log(`  ✅ ${exchange}: 0 条记录，跳过`);
      continue;
    }

    // 分类：日报汇总 vs 单条
    const digests = rows.filter(r => isDigestTitle(r.title) || isDigestTitle(r.title_zh));
    const singles = rows.filter(r => !isDigestTitle(r.title) && !isDigestTitle(r.title_zh));

    console.log(`  📊 ${exchange}: 共 ${rows.length} 条（日报 ${digests.length} 条，单条 ${singles.length} 条）`);

    if (singles.length === 0) {
      console.log(`     ✅ 无需清理`);
      continue;
    }

    // 删除单条
    let deleted = 0;
    for (const item of singles) {
      const ok = await supabaseDelete(item.content_hash);
      if (ok) {
        deleted++;
      } else {
        console.warn(`     ⚠️ 删除失败: ${item.content_hash} (${item.title?.slice(0, 40)})`);
      }
    }

    console.log(`     🗑️ 已删除 ${deleted}/${singles.length} 条单条数据`);
    totalDeleted += deleted;
    totalKept += digests.length;
  }

  console.log(`\n✅ 清理完成！共删除 ${totalDeleted} 条，保留 ${totalKept} 条日报汇总`);
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
