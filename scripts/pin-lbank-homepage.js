#!/usr/bin/env node
/**
 * 将 LBank Pay 文章固定到首页轮播第一位
 * 写入 homepage_curation 表 (en + zh + fil)
 * 用法：cd ~/hashspring-next && node scripts/pin-lbank-homepage.js
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnv() {
  for (const p of ['worker/.env', '.env', '.env.local']) {
    try {
      const content = readFileSync(resolve(projectRoot, p), 'utf-8');
      const vars = {};
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) vars[m[1]] = m[2].trim();
      }
      if (vars.SUPABASE_URL && vars.SUPABASE_SERVICE_KEY) return vars;
    } catch {}
  }
  return null;
}

const env = loadEnv();
if (!env) { console.error('❌ 缺少环境变量'); process.exit(1); }

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;
const SLUG = 'lbank-pay-expands-with-six-new-fiat-channels-launches-exclusive-campaign';

async function upsertCuration(locale, slotIndex) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/homepage_curation`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      locale,
      slot_index: slotIndex,
      article_slug: SLUG,
      label: slotIndex === 1 ? 'Featured' : '',
      note: 'LBank Pay article - pinned to homepage rotation',
      is_active: true,
    }),
  });
  const status = res.status;
  const body = await res.text();
  return { status, body };
}

async function main() {
  console.log('📌 将 LBank Pay 固定到首页轮播第一位...\n');

  for (const locale of ['en', 'zh', 'fil']) {
    const result = await upsertCuration(locale, 1);
    if (result.status >= 400) {
      console.error(`❌ ${locale} slot 1 失败 (${result.status}): ${result.body.slice(0, 200)}`);
    } else {
      console.log(`✅ ${locale} slot 1 → LBank Pay`);
    }
  }

  console.log('\n🎉 完成！首页轮播第一条已固定为 LBank Pay 文章。');
  console.log('   注：ISR 缓存约 2 分钟后刷新，届时首页将自动更新。');
}

main().catch(console.error);
