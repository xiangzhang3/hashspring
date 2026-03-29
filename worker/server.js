/**
 * HashSpring 内容抓取监控面板
 *
 * 启动: node server.js
 * 打开: http://localhost:3377
 *
 * 功能：
 * - 实时查看所有 35+ 源的抓取状态
 * - 手动触发单源/全部抓取
 * - 查看抓取到的内容列表
 * - 统计面板（成功率、内容数量、最新更新时间）
 */

import http from 'http';
import { URL } from 'url';

// ─── 配置 ─────────────────────────────────────────────────
const PORT = 3377;

// ─── 状态存储（内存） ──────────────────────────────────────
const state = {
  sources: [],        // 每个源的状态
  items: [],          // 所有抓取到的内容
  logs: [],           // 操作日志
  lastFullFetch: null,
  totalFetches: 0,
  isRunning: false,
};

function log(msg, level = 'info') {
  const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const entry = { ts, msg, level };
  state.logs.unshift(entry);
  if (state.logs.length > 200) state.logs.length = 200;
  console.log(`[${ts}] ${msg}`);
}

// ─── RSS 解析 ─────────────────────────────────────────────
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '');
}

function parseRSS(xml) {
  const items = [];
  const blocks = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) || [];
  for (const block of blocks) {
    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? decodeEntities(m[1].trim()) : '';
    };
    const getAtomLink = () => {
      const m = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
      return m ? m[1] : '';
    };
    const title = getTag('title');
    const link = getTag('link') || getAtomLink() || getTag('guid');
    const pubDate = getTag('pubDate') || getTag('dc:date') || getTag('published') || getTag('updated');
    const description = getTag('description') || getTag('content:encoded') || getTag('summary');
    if (title && title.length > 5) {
      items.push({ title, link, pubDate, description: description.slice(0, 300) });
    }
  }
  return items;
}

// ─── 源定义 ──────────────────────────────────────────────
const ALL_SOURCES = [
  // 英文 RSS (19)
  { id: 'coindesk', name: 'CoinDesk', type: 'rss', lang: 'en', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { id: 'cointelegraph', name: 'CoinTelegraph', type: 'rss', lang: 'en', url: 'https://cointelegraph.com/rss' },
  { id: 'theblock', name: 'TheBlock', type: 'rss', lang: 'en', url: 'https://www.theblock.co/rss.xml' },
  { id: 'decrypt', name: 'Decrypt', type: 'rss', lang: 'en', url: 'https://decrypt.co/feed' },
  { id: 'btcmag', name: 'Bitcoin Magazine', type: 'rss', lang: 'en', url: 'https://bitcoinmagazine.com/.rss/full/' },
  { id: 'dlnews', name: 'DL News', type: 'rss', lang: 'en', url: 'https://www.dlnews.com/arc/outboundfeeds/rss/' },
  { id: 'blockworks', name: 'Blockworks', type: 'rss', lang: 'en', url: 'https://blockworks.co/feed' },
  { id: 'cryptoslate', name: 'CryptoSlate', type: 'rss', lang: 'en', url: 'https://cryptoslate.com/feed/' },
  { id: 'cryptopotato', name: 'CryptoPotato', type: 'rss', lang: 'en', url: 'https://cryptopotato.com/feed/' },
  { id: 'beincrypto', name: 'BeInCrypto', type: 'rss', lang: 'en', url: 'https://beincrypto.com/feed/' },
  { id: 'utoday', name: 'U.Today', type: 'rss', lang: 'en', url: 'https://u.today/rss' },
  { id: 'ambcrypto', name: 'AMBCrypto', type: 'rss', lang: 'en', url: 'https://ambcrypto.com/feed/' },
  { id: 'newsbtc', name: 'NewsBTC', type: 'rss', lang: 'en', url: 'https://www.newsbtc.com/feed/' },
  { id: 'dailyhodl', name: 'DailyHodl', type: 'rss', lang: 'en', url: 'https://dailyhodl.com/feed/' },
  { id: 'bitcoinist', name: 'Bitcoinist', type: 'rss', lang: 'en', url: 'https://bitcoinist.com/feed/' },
  { id: 'defiant', name: 'The Defiant', type: 'rss', lang: 'en', url: 'https://thedefiant.io/feed' },
  { id: 'nftgators', name: 'NFTGators', type: 'rss', lang: 'en', url: 'https://www.nftgators.com/feed/' },
  { id: 'l2beat', name: 'L2Beat', type: 'rss', lang: 'en', url: 'https://l2beat.com/feed.xml' },
  { id: 'unchained', name: 'Unchained', type: 'rss', lang: 'en', url: 'https://unchainedcrypto.com/feed/' },
  // 中文媒体 (8)
  { id: 'foresight', name: 'Foresight News', type: 'rss', lang: 'zh', url: 'https://foresightnews.pro/rss' },
  { id: 'panews', name: 'PANews', type: 'rss', lang: 'zh', url: 'https://www.panewslab.com/rss/zh/index.xml' },
  { id: 'chaincatcher', name: 'ChainCatcher', type: 'rss', lang: 'zh', url: 'https://www.chaincatcher.com/rss' },
  { id: 'blockbeats', name: 'BlockBeats', type: 'rss', lang: 'zh', url: 'https://www.theblockbeats.info/rss' },
  { id: 'odaily', name: 'Odaily', type: 'rss', lang: 'zh', url: 'https://www.odaily.news/rss' },
  { id: 'techflow', name: 'TechFlow', type: 'rss', lang: 'zh', url: 'https://www.techflowpost.com/rss' },
  { id: 'jinse', name: '金色财经', type: 'rss', lang: 'zh', url: 'https://www.jinse.cn/rss' },
  { id: 'wublock', name: '吴说区块链', type: 'rss', lang: 'zh', url: 'https://wublock.substack.com/feed' },
  // 交易所 (5)
  { id: 'binance', name: 'Binance', type: 'exchange', lang: 'en', url: 'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=15' },
  { id: 'okx', name: 'OKX', type: 'exchange', lang: 'en', url: 'https://www.okx.com/api/v5/public/announcements?page=1&limit=10' },
  { id: 'bybit', name: 'Bybit', type: 'exchange', lang: 'en', url: 'https://api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto&limit=10' },
  { id: 'bitget', name: 'Bitget', type: 'exchange', lang: 'en', url: 'https://api.bitget.com/api/v2/public/annoucements?language=en_US&annType=coin_listings&pageSize=10' },
  { id: 'coinbase', name: 'Coinbase', type: 'exchange', lang: 'en', url: 'https://blog.coinbase.com/feed' },
  // 链上 (2)
  { id: 'whalealert', name: 'Whale Alert', type: 'onchain', lang: 'en', url: 'https://whale-alert.io/feed' },
  { id: 'snapshot', name: 'Snapshot Gov', type: 'onchain', lang: 'en', url: 'https://hub.snapshot.org/graphql' },
];

// 初始化源状态
for (const src of ALL_SOURCES) {
  state.sources.push({
    ...src,
    status: 'idle',      // idle | fetching | success | error
    itemCount: 0,
    lastFetch: null,
    lastError: null,
    duration: 0,
  });
}

// ─── 抓取逻辑 ─────────────────────────────────────────────
async function fetchSingleSource(srcState) {
  srcState.status = 'fetching';
  srcState.lastError = null;
  const start = Date.now();

  try {
    let items = [];

    if (srcState.type === 'rss' || (srcState.type === 'exchange' && srcState.id === 'coinbase')) {
      const res = await fetch(srcState.url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'HashSpring/1.0 (crypto news aggregator)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      items = parseRSS(xml).map(item => ({
        ...item,
        source: srcState.name,
        sourceType: srcState.type,
        lang: srcState.lang,
      }));
    } else if (srcState.id === 'binance') {
      const res = await fetch(srcState.url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const articles = data?.data?.catalogs?.[0]?.articles || [];
      items = articles.map(a => ({
        title: a.title,
        link: `https://www.binance.com/en/support/announcement/${a.code}`,
        pubDate: new Date(a.releaseDate).toISOString(),
        source: 'Binance', sourceType: 'exchange', lang: 'en',
      }));
    } else if (srcState.id === 'okx') {
      const res = await fetch(srcState.url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data?.data || [];
      items = (Array.isArray(list) ? list : []).map(a => ({
        title: a.title || '', link: a.url || '',
        pubDate: a.pTime ? new Date(Number(a.pTime)).toISOString() : new Date().toISOString(),
        source: 'OKX', sourceType: 'exchange', lang: 'en',
      }));
    } else if (srcState.id === 'bybit') {
      const res = await fetch(srcState.url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data?.result?.list || [];
      items = (Array.isArray(list) ? list : []).map(a => ({
        title: a.title || '', link: a.url || '',
        pubDate: a.publishTime ? new Date(Number(a.publishTime)).toISOString() : new Date().toISOString(),
        source: 'Bybit', sourceType: 'exchange', lang: 'en',
      }));
    } else if (srcState.id === 'bitget') {
      const res = await fetch(srcState.url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data?.data || [];
      items = (Array.isArray(list) ? list : []).map(a => ({
        title: a.annTitle || '', link: `https://www.bitget.com/support/articles/${a.annId}`,
        pubDate: a.annTime ? new Date(Number(a.annTime)).toISOString() : new Date().toISOString(),
        source: 'Bitget', sourceType: 'exchange', lang: 'en',
      }));
    } else if (srcState.id === 'snapshot') {
      const res = await fetch(srcState.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ proposals(first:10, skip:0, orderBy:"created", orderDirection:desc, where:{state:"active"}) { id title space { id name } created end scores_total } }`
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = (data?.data?.proposals || []).filter(p => p.scores_total > 100).map(p => ({
        title: `Governance: ${p.space?.name || '?'} — ${p.title}`,
        link: `https://snapshot.org/#/${p.space?.id}/proposal/${p.id}`,
        pubDate: new Date(p.created * 1000).toISOString(),
        source: 'Snapshot', sourceType: 'onchain', lang: 'en',
      }));
    } else if (srcState.id === 'whalealert') {
      const res = await fetch(srcState.url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'HashSpring/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      items = parseRSS(xml).map(item => ({
        ...item, source: 'Whale Alert', sourceType: 'onchain', lang: 'en',
      }));
    }

    srcState.status = 'success';
    srcState.itemCount = items.length;
    srcState.lastFetch = new Date().toISOString();
    srcState.duration = Date.now() - start;

    // 合并到全局 items（去重）
    for (const item of items) {
      const key = item.title.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '').slice(0, 50);
      if (!state.items.find(i => i._key === key)) {
        state.items.unshift({ ...item, _key: key, _fetchedAt: new Date().toISOString() });
      }
    }
    // 只保留最新 500 条
    if (state.items.length > 500) state.items.length = 500;

    log(`✅ ${srcState.name}: ${items.length} 条 (${srcState.duration}ms)`);
    return items.length;
  } catch (e) {
    srcState.status = 'error';
    srcState.lastError = e.message;
    srcState.duration = Date.now() - start;
    srcState.lastFetch = new Date().toISOString();
    log(`❌ ${srcState.name}: ${e.message}`, 'error');
    return 0;
  }
}

async function fetchAll() {
  if (state.isRunning) { log('⏳ 已有抓取任务在运行，跳过'); return; }
  state.isRunning = true;
  log('🚀 开始全量抓取...');
  const start = Date.now();

  const promises = state.sources.map(src => fetchSingleSource(src));
  const results = await Promise.allSettled(promises);

  const totalItems = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
  const successCount = state.sources.filter(s => s.status === 'success').length;
  const errorCount = state.sources.filter(s => s.status === 'error').length;

  state.lastFullFetch = new Date().toISOString();
  state.totalFetches++;
  state.isRunning = false;

  log(`📊 抓取完成: ${successCount} 成功, ${errorCount} 失败, ${totalItems} 条新内容 (${Date.now() - start}ms)`);
}

// ─── Dashboard HTML ──────────────────────────────────────
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HashSpring Content Monitor</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e17; color: #e0e0e0; }
  .header { background: linear-gradient(135deg, #1a1f2e, #0d1117); padding: 20px 30px; border-bottom: 1px solid #2a3040; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 22px; color: #fff; }
  .header h1 span { color: #3b82f6; }
  .stats { display: flex; gap: 20px; }
  .stat { background: #1a1f2e; padding: 8px 16px; border-radius: 8px; text-align: center; }
  .stat .num { font-size: 24px; font-weight: bold; color: #3b82f6; }
  .stat .label { font-size: 11px; color: #888; margin-top: 2px; }
  .toolbar { padding: 15px 30px; display: flex; gap: 12px; align-items: center; border-bottom: 1px solid #1a1f2e; }
  .btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
  .btn-primary { background: #3b82f6; color: #fff; }
  .btn-primary:hover { background: #2563eb; }
  .btn-primary:disabled { background: #334155; color: #666; cursor: not-allowed; }
  .btn-secondary { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
  .btn-secondary:hover { background: #334155; }
  .auto-label { color: #888; font-size: 12px; margin-left: 10px; }
  .main { display: grid; grid-template-columns: 380px 1fr; height: calc(100vh - 140px); }
  .sources-panel { border-right: 1px solid #1a1f2e; overflow-y: auto; padding: 10px; }
  .source-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s; }
  .source-card:hover { border-color: #3b82f6; }
  .source-card.fetching { border-color: #f59e0b; background: #1c1a0e; }
  .source-card.success { border-left: 3px solid #22c55e; }
  .source-card.error { border-left: 3px solid #ef4444; }
  .source-header { display: flex; justify-content: space-between; align-items: center; }
  .source-name { font-weight: 600; font-size: 13px; }
  .source-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-rss { background: #1e3a5f; color: #60a5fa; }
  .badge-exchange { background: #3b2d0e; color: #fbbf24; }
  .badge-onchain { background: #1a3a2a; color: #4ade80; }
  .badge-zh { background: #3b1e3e; color: #c084fc; }
  .source-meta { display: flex; gap: 12px; margin-top: 4px; font-size: 11px; color: #666; }
  .source-meta .count { color: #3b82f6; font-weight: 600; }
  .source-meta .error { color: #ef4444; }
  .source-meta .duration { color: #888; }
  .content-panel { display: flex; flex-direction: column; }
  .tabs { display: flex; border-bottom: 1px solid #1e293b; padding: 0 20px; }
  .tab { padding: 10px 20px; cursor: pointer; font-size: 13px; color: #888; border-bottom: 2px solid transparent; }
  .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
  .content-list { flex: 1; overflow-y: auto; padding: 10px 20px; }
  .news-item { padding: 12px; border-bottom: 1px solid #1a1f2e; display: flex; gap: 12px; }
  .news-item:hover { background: #111827; }
  .news-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .dot-en { background: #3b82f6; }
  .dot-zh { background: #a855f7; }
  .news-body { flex: 1; }
  .news-title { font-size: 13px; line-height: 1.5; }
  .news-title a { color: #e0e0e0; text-decoration: none; }
  .news-title a:hover { color: #3b82f6; }
  .news-footer { display: flex; gap: 10px; margin-top: 4px; font-size: 11px; color: #666; }
  .news-source { color: #3b82f6; }
  .log-panel { flex: 1; overflow-y: auto; padding: 10px 20px; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; }
  .log-entry { padding: 3px 0; border-bottom: 1px solid #0d1117; }
  .log-ts { color: #555; }
  .log-info { color: #94a3b8; }
  .log-error { color: #ef4444; }
  .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .section-title { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 1px; padding: 10px 4px 6px; }
</style>
</head>
<body>
<div class="header">
  <h1><span>HashSpring</span> Content Monitor</h1>
  <div class="stats">
    <div class="stat"><div class="num" id="s-total">0</div><div class="label">Total Sources</div></div>
    <div class="stat"><div class="num" id="s-ok" style="color:#22c55e">0</div><div class="label">Online</div></div>
    <div class="stat"><div class="num" id="s-err" style="color:#ef4444">0</div><div class="label">Failed</div></div>
    <div class="stat"><div class="num" id="s-items" style="color:#f59e0b">0</div><div class="label">Items</div></div>
  </div>
</div>
<div class="toolbar">
  <button class="btn btn-primary" id="btn-fetch" onclick="fetchAll()">🚀 全量抓取</button>
  <button class="btn btn-secondary" onclick="location.reload()">🔄 刷新</button>
  <label class="auto-label"><input type="checkbox" id="auto-refresh" checked> 自动刷新 (3s)</label>
  <label class="auto-label"><input type="checkbox" id="auto-fetch"> 自动抓取 (每60s)</label>
  <span class="auto-label" id="last-fetch">—</span>
</div>
<div class="main">
  <div class="sources-panel" id="sources-panel"></div>
  <div class="content-panel">
    <div class="tabs">
      <div class="tab active" data-tab="items" onclick="switchTab('items')">📰 内容列表</div>
      <div class="tab" data-tab="logs" onclick="switchTab('logs')">📋 抓取日志</div>
    </div>
    <div class="content-list" id="items-panel"></div>
    <div class="log-panel" id="logs-panel" style="display:none"></div>
  </div>
</div>

<script>
let currentTab = 'items';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('items-panel').style.display = tab === 'items' ? '' : 'none';
  document.getElementById('logs-panel').style.display = tab === 'logs' ? '' : 'none';
}

async function fetchAll() {
  const btn = document.getElementById('btn-fetch');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 抓取中...';
  try { await fetch('/api/fetch-all', { method: 'POST' }); }
  catch(e) { console.error(e); }
  btn.disabled = false; btn.textContent = '🚀 全量抓取';
  refreshData();
}

async function fetchOne(id) {
  try { await fetch('/api/fetch/' + id, { method: 'POST' }); }
  catch(e) { console.error(e); }
  refreshData();
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function badgeClass(src) {
  if (src.lang === 'zh') return 'badge-zh';
  if (src.type === 'exchange') return 'badge-exchange';
  if (src.type === 'onchain') return 'badge-onchain';
  return 'badge-rss';
}

function badgeLabel(src) {
  if (src.lang === 'zh') return 'ZH';
  return src.type.toUpperCase();
}

async function refreshData() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    // Stats
    document.getElementById('s-total').textContent = data.sources.length;
    document.getElementById('s-ok').textContent = data.sources.filter(s => s.status === 'success').length;
    document.getElementById('s-err').textContent = data.sources.filter(s => s.status === 'error').length;
    document.getElementById('s-items').textContent = data.items.length;
    document.getElementById('last-fetch').textContent = data.lastFullFetch ? '上次全量: ' + timeAgo(data.lastFullFetch) : '';

    // Sources
    const sp = document.getElementById('sources-panel');
    const types = { 'EN RSS': s => s.type === 'rss' && s.lang === 'en', 'ZH 媒体': s => s.type === 'rss' && s.lang === 'zh', '交易所': s => s.type === 'exchange', '链上': s => s.type === 'onchain' };
    let html = '';
    for (const [label, filter] of Object.entries(types)) {
      const filtered = data.sources.filter(filter);
      html += '<div class="section-title">' + label + ' (' + filtered.length + ')</div>';
      for (const src of filtered) {
        html += '<div class="source-card ' + src.status + '" onclick="fetchOne(\\'' + src.id + '\\')">';
        html += '<div class="source-header"><span class="source-name">' + (src.status === 'fetching' ? '<span class="spinner"></span> ' : '') + src.name + '</span>';
        html += '<span class="source-badge ' + badgeClass(src) + '">' + badgeLabel(src) + '</span></div>';
        html += '<div class="source-meta">';
        html += '<span class="count">' + src.itemCount + ' 条</span>';
        if (src.lastError) html += '<span class="error">' + src.lastError.slice(0, 30) + '</span>';
        if (src.duration) html += '<span class="duration">' + src.duration + 'ms</span>';
        if (src.lastFetch) html += '<span>' + timeAgo(src.lastFetch) + '</span>';
        html += '</div></div>';
      }
    }
    sp.innerHTML = html;

    // Items
    if (currentTab === 'items') {
      const ip = document.getElementById('items-panel');
      ip.innerHTML = data.items.slice(0, 100).map(item =>
        '<div class="news-item"><div class="news-dot dot-' + (item.lang || 'en') + '"></div><div class="news-body">' +
        '<div class="news-title"><a href="' + (item.link || '#') + '" target="_blank">' + item.title + '</a></div>' +
        '<div class="news-footer"><span class="news-source">' + item.source + '</span>' +
        '<span>' + timeAgo(item.pubDate) + '</span>' +
        '<span>' + timeAgo(item._fetchedAt) + ' fetched</span></div></div></div>'
      ).join('') || '<p style="color:#555;padding:20px;">点击 🚀 全量抓取 开始采集内容</p>';
    }

    // Logs
    if (currentTab === 'logs') {
      const lp = document.getElementById('logs-panel');
      lp.innerHTML = data.logs.map(l =>
        '<div class="log-entry"><span class="log-ts">[' + l.ts + ']</span> <span class="log-' + l.level + '">' + l.msg + '</span></div>'
      ).join('');
    }
  } catch(e) { console.error('refresh error', e); }
}

// Auto refresh
setInterval(() => {
  if (document.getElementById('auto-refresh').checked) refreshData();
}, 3000);

// Auto fetch
setInterval(() => {
  if (document.getElementById('auto-fetch').checked) fetchAll();
}, 60000);

refreshData();
</script>
</body>
</html>`;
}

// ─── HTTP Server ─────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (path === '/' || path === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getDashboardHTML());
  } else if (path === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      sources: state.sources,
      items: state.items.slice(0, 100),
      logs: state.logs.slice(0, 50),
      lastFullFetch: state.lastFullFetch,
      totalFetches: state.totalFetches,
      isRunning: state.isRunning,
    }));
  } else if (path === '/api/fetch-all' && req.method === 'POST') {
    fetchAll(); // async, don't await
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Fetch started' }));
  } else if (path.startsWith('/api/fetch/') && req.method === 'POST') {
    const id = path.split('/').pop();
    const src = state.sources.find(s => s.id === id);
    if (src) {
      fetchSingleSource(src); // async
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, source: id }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Source not found' }));
    }
  } else if (path === '/api/items') {
    const lang = url.searchParams.get('lang');
    const source = url.searchParams.get('source');
    let filtered = state.items;
    if (lang) filtered = filtered.filter(i => i.lang === lang);
    if (source) filtered = filtered.filter(i => i.source === source);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ total: filtered.length, items: filtered.slice(0, 200) }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  HashSpring Content Monitor                  ║');
  console.log('║                                              ║');
  console.log(`║  🌐 Dashboard: http://localhost:${PORT}        ║`);
  console.log('║  📡 API:       /api/status                   ║');
  console.log('║  📰 Items:     /api/items?lang=en            ║');
  console.log('║                                              ║');
  console.log('║  点击 🚀 全量抓取 开始采集内容                 ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
