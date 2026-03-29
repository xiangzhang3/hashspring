#!/usr/bin/env node
/**
 * 一次性脚本：清除所有快讯标题末尾的句号
 * 运行方式: node worker/fix-titles.js
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=minimal',
      ...options.headers,
    },
  });
  return res;
}

function cleanTitle(t) {
  return t ? t.replace(/[.。．]+\s*$/, '').trim() : t;
}

async function main() {
  console.log('🔍 查找末尾含句号的标题...\n');

  // 查询所有记录的标题字段
  const res = await supaFetch(
    'flash_news?select=content_hash,title,title_en,title_zh&or=(title.like.%.,title_en.like.%.,title_zh.like.%.,title.like.%.%E3%80%82)&limit=500',
    { prefer: 'return=representation' }
  );

  if (!res.ok) {
    // 如果 or 查询不支持，获取全部然后本地过滤
    console.log('  使用全量扫描模式...');
    const allRes = await supaFetch('flash_news?select=content_hash,title,title_en,title_zh&limit=2000', { prefer: 'return=representation' });
    if (!allRes.ok) {
      console.error('❌ 查询失败:', await allRes.text());
      return;
    }
    var rows = await allRes.json();
  } else {
    var rows = await res.json();
  }

  // 本地过滤：找出末尾有句号的
  const needsFix = rows.filter(r => {
    return (r.title && /[.。．]\s*$/.test(r.title)) ||
           (r.title_en && /[.。．]\s*$/.test(r.title_en)) ||
           (r.title_zh && /[.。．]\s*$/.test(r.title_zh));
  });

  console.log(`📊 共 ${rows.length} 条记录，${needsFix.length} 条需要修复\n`);

  if (needsFix.length === 0) {
    console.log('✅ 所有标题已经是干净的，无需修复');
    return;
  }

  // 逐条更新
  let fixed = 0;
  for (const row of needsFix) {
    const updates = {};
    if (row.title && /[.。．]\s*$/.test(row.title)) updates.title = cleanTitle(row.title);
    if (row.title_en && /[.。．]\s*$/.test(row.title_en)) updates.title_en = cleanTitle(row.title_en);
    if (row.title_zh && /[.。．]\s*$/.test(row.title_zh)) updates.title_zh = cleanTitle(row.title_zh);

    if (Object.keys(updates).length > 0) {
      const updateRes = await supaFetch(
        `flash_news?content_hash=eq.${encodeURIComponent(row.content_hash)}`,
        { method: 'PATCH', body: JSON.stringify(updates) }
      );

      if (updateRes.ok) {
        fixed++;
        const sample = updates.title || updates.title_en || updates.title_zh || '';
        console.log(`  ✅ [${fixed}/${needsFix.length}] ${sample.slice(0, 60)}...`);
      } else {
        console.warn(`  ⚠️ 更新失败: ${row.content_hash} — ${(await updateRes.text()).slice(0, 100)}`);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 50));
    }
  }

  console.log(`\n🎉 完成！修复了 ${fixed}/${needsFix.length} 条标题`);
}

main().catch(console.error);
