/**
 * 内容源抓取模块
 * 35+ 源：19 英文 RSS + 7 中文媒体 + 7 交易所 + 2 链上数据
 */

// ─── RSS 解析 ───────────────────────────────────────────────
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
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
      items.push({ title, link, pubDate, description: description.slice(0, 500) });
    }
  }
  return items;
}

async function fetchRSS(url, sourceName, lang = 'en') {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'HashSpring/1.0 (crypto news aggregator)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml).map(item => ({
      ...item,
      source: sourceName,
      sourceType: 'rss',
      lang,
    }));
  } catch (e) {
    console.warn(`    ⚠️ RSS 失败: ${sourceName} — ${e.message}`);
    return [];
  }
}

// ─── 英文 RSS 源 ────────────────────────────────────────────
const EN_RSS_SOURCES = [
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'TheBlock', url: 'https://www.theblock.co/rss.xml' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
  { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/' },
  { name: 'DL News', url: 'https://www.dlnews.com/arc/outboundfeeds/rss/' },
  { name: 'Blockworks', url: 'https://blockworks.co/feed' },
  { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
  { name: 'CryptoPotato', url: 'https://cryptopotato.com/feed/' },
  { name: 'BeInCrypto', url: 'https://beincrypto.com/feed/' },
  { name: 'U.Today', url: 'https://u.today/rss' },
  { name: 'AMBCrypto', url: 'https://ambcrypto.com/feed/' },
  { name: 'NewsBTC', url: 'https://www.newsbtc.com/feed/' },
  { name: 'DailyHodl', url: 'https://dailyhodl.com/feed/' },
  { name: 'Bitcoinist', url: 'https://bitcoinist.com/feed/' },
  { name: 'The Defiant', url: 'https://thedefiant.io/feed' },
  { name: 'NFTGators', url: 'https://www.nftgators.com/feed/' },
  { name: 'L2Beat', url: 'https://l2beat.com/feed.xml' },
  { name: 'Unchained', url: 'https://unchainedcrypto.com/feed/' },
];

// ─── 中文媒体源 ─────────────────────────────────────────────
const ZH_RSS_SOURCES = [
  { name: 'Foresight News', url: 'https://foresightnews.pro/rss' },
  { name: 'PANews', url: 'https://www.panewslab.com/rss/zh/index.xml' },
  { name: 'ChainCatcher', url: 'https://www.chaincatcher.com/rss' },
  { name: 'BlockBeats', url: 'https://www.theblockbeats.info/rss' },
  { name: 'Odaily', url: 'https://www.odaily.news/rss' },
  { name: 'TechFlow', url: 'https://www.techflowpost.com/rss' },
  { name: '金色财经', url: 'https://www.jinse.cn/rss' },
  { name: '吴说区块链', url: 'https://wublock.substack.com/feed' },
];

// ─── 交易所抓取 ─────────────────────────────────────────────
async function fetchBinance() {
  const items = [];
  try {
    // New Listings (catalogId=48)
    const res = await fetch(
      'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=15',
      { signal: AbortSignal.timeout(10000) },
    );
    if (res.ok) {
      const data = await res.json();
      const articles = data?.data?.catalogs?.[0]?.articles || [];
      for (const a of articles) {
        items.push({
          title: a.title,
          link: `https://www.binance.com/en/support/announcement/${a.code}`,
          pubDate: new Date(a.releaseDate).toISOString(),
          description: a.title,
          source: /alpha/i.test(a.title) ? 'Binance Alpha' : 'Binance',
          sourceType: 'exchange',
          lang: 'en',
        });
      }
    }
  } catch (e) {
    console.warn(`    ⚠️ Binance Listings 失败: ${e.message}`);
  }

  try {
    // Futures (catalogId=130)
    const res = await fetch(
      'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=130&pageNo=1&pageSize=10',
      { signal: AbortSignal.timeout(10000) },
    );
    if (res.ok) {
      const data = await res.json();
      const articles = data?.data?.catalogs?.[0]?.articles || [];
      for (const a of articles) {
        items.push({
          title: a.title,
          link: `https://www.binance.com/en/support/announcement/${a.code}`,
          pubDate: new Date(a.releaseDate).toISOString(),
          description: a.title,
          source: 'Binance Futures',
          sourceType: 'exchange',
          lang: 'en',
        });
      }
    }
  } catch (e) {
    console.warn(`    ⚠️ Binance Futures 失败: ${e.message}`);
  }

  return items;
}

async function fetchOKX() {
  try {
    const res = await fetch(
      'https://www.okx.com/api/v5/public/announcements?page=1&limit=10',
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.title || '',
      link: a.url || 'https://www.okx.com/support/hc/en-us',
      pubDate: a.pTime ? new Date(Number(a.pTime)).toISOString() : new Date().toISOString(),
      description: a.title || '',
      source: 'OKX',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ OKX 失败: ${e.message}`);
    return [];
  }
}

async function fetchBybit() {
  try {
    const res = await fetch(
      'https://api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto&limit=10',
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.result?.list || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.title || '',
      link: a.url || 'https://announcements.bybit.com',
      pubDate: a.publishTime ? new Date(Number(a.publishTime)).toISOString() : new Date().toISOString(),
      description: a.description || a.title || '',
      source: 'Bybit',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ Bybit 失败: ${e.message}`);
    return [];
  }
}

async function fetchBitget() {
  try {
    const res = await fetch(
      'https://api.bitget.com/api/v2/public/annoucements?language=en_US&annType=coin_listings&pageSize=10',
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.annTitle || '',
      link: `https://www.bitget.com/support/articles/${a.annId}`,
      pubDate: a.annTime ? new Date(Number(a.annTime)).toISOString() : new Date().toISOString(),
      description: a.annTitle || '',
      source: 'Bitget',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ Bitget 失败: ${e.message}`);
    return [];
  }
}

async function fetchCoinbase() {
  try {
    const res = await fetch('https://blog.coinbase.com/feed', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml)
      .filter(item => /list|launch|add|new asset/i.test(item.title))
      .map(item => ({
        ...item,
        source: 'Coinbase',
        sourceType: 'exchange',
        lang: 'en',
      }));
  } catch (e) {
    console.warn(`    ⚠️ Coinbase 失败: ${e.message}`);
    return [];
  }
}

// ─── 链上数据源 ─────────────────────────────────────────────
async function fetchWhaleAlert() {
  try {
    // Whale Alert doesn't have a free API — use their RSS/Twitter proxy
    const res = await fetch('https://whale-alert.io/feed', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml).map(item => ({
      ...item,
      source: 'Whale Alert',
      sourceType: 'onchain',
      lang: 'en',
    }));
  } catch {
    return [];
  }
}

async function fetchSnapshot() {
  try {
    const res = await fetch('https://hub.snapshot.org/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          proposals(first: 10, skip: 0, orderBy: "created", orderDirection: desc, where: { state: "active" }) {
            id title space { id name } created end scores_total
          }
        }`
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const proposals = data?.data?.proposals || [];
    return proposals
      .filter(p => p.scores_total > 100)
      .map(p => ({
        title: `Governance: ${p.space?.name || 'Unknown'} — ${p.title}`,
        link: `https://snapshot.org/#/${p.space?.id}/proposal/${p.id}`,
        pubDate: new Date(p.created * 1000).toISOString(),
        description: `Active governance proposal in ${p.space?.name}`,
        source: 'Snapshot',
        sourceType: 'onchain',
        lang: 'en',
      }));
  } catch {
    return [];
  }
}

// ─── 聚合所有源 ─────────────────────────────────────────────
export async function fetchAllSources() {
  const results = await Promise.allSettled([
    // 英文 RSS (19 源)
    ...EN_RSS_SOURCES.map(s => fetchRSS(s.url, s.name, 'en')),
    // 中文媒体 (8 源)
    ...ZH_RSS_SOURCES.map(s => fetchRSS(s.url, s.name, 'zh')),
    // 交易所 (5 源)
    fetchBinance(),
    fetchOKX(),
    fetchBybit(),
    fetchBitget(),
    fetchCoinbase(),
    // 链上 (2 源)
    fetchWhaleAlert(),
    fetchSnapshot(),
  ]);

  const allItems = [];
  let successCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
      if (result.value.length > 0) successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`    📊 源状态: ${successCount} 成功, ${failCount} 失败`);

  // 去重 (基于标题相似度)
  const seen = new Map();
  const unique = [];
  for (const item of allItems) {
    const key = item.title.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '').slice(0, 50);
    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push(item);
    }
  }

  // 按时间排序（最新在前）
  unique.sort((a, b) => {
    try {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    } catch {
      return 0;
    }
  });

  return unique.slice(0, 100); // 每次最多处理 100 条
}
