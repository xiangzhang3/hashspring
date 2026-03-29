/**
 * 内容源抓取模块
 * 60+ 源：27 英文 RSS + 9 中文媒体 + 10 交易所 + 4 链上/数据 + 2 聚合器 + Reddit + Twitter KOL
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
  // ─── 新增英文 RSS 源 ───
  { name: 'Messari', url: 'https://messari.io/rss' },
  { name: 'CoinGecko Blog', url: 'https://blog.coingecko.com/feed/' },
  { name: 'Bankless', url: 'https://www.bankless.com/rss/' },
  { name: 'DefiLlama News', url: 'https://feed.defillama.com/' },
  { name: 'Mirror.xyz', url: 'https://mirror.xyz/feed/highlights' },
  { name: 'Nansen', url: 'https://www.nansen.ai/research/rss.xml' },
  { name: 'Artemis', url: 'https://www.artemis.xyz/blog/rss.xml' },
  { name: 'CryptoQuant', url: 'https://cryptoquant.com/blog/rss' },
];

// ─── 中文媒体源 ─────────────────────────────────────────────
const ZH_RSS_SOURCES = [
  // Foresight News 直接 RSS 不稳定，改用 RSSHub 代理
  { name: 'Foresight News', url: 'https://rsshub.app/foresightnews' },
  { name: 'PANews', url: 'https://www.panewslab.com/rss/zh/index.xml' },
  { name: 'ChainCatcher', url: 'https://www.chaincatcher.com/rss' },
  { name: 'BlockBeats', url: 'https://www.theblockbeats.info/rss' },
  { name: 'Odaily', url: 'https://www.odaily.news/rss' },
  { name: 'TechFlow', url: 'https://www.techflowpost.com/rss' },
  { name: '金色财经', url: 'https://rsshub.app/jinse/lives' }, // 金色财经也改用 RSSHub
  { name: '吴说区块链', url: 'https://wublock.substack.com/feed' },
  { name: 'Followin', url: 'https://followin.io/feed' },
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

// ─── 新增交易所：Gate.io ──────────────────────────────────────
async function fetchGateio() {
  try {
    const res = await fetch(
      'https://www.gate.io/api/v4/announcements?page=1&limit=15',
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'HashSpring/1.0' } },
    );
    if (!res.ok) {
      // 备用：用 Gate.io 公告 RSS
      return fetchRSS('https://www.gate.io/articlelist/ann/0', 'Gate.io', 'en')
        .then(items => items.map(i => ({ ...i, sourceType: 'exchange' })));
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data?.data || []);
    return items.map(a => ({
      title: a.subject || a.title || '',
      link: a.url || `https://www.gate.io/article/${a.id || ''}`,
      pubDate: a.created_at || a.publish_time || new Date().toISOString(),
      description: a.subject || a.title || '',
      source: 'Gate.io',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ Gate.io 失败: ${e.message}`);
    return [];
  }
}

// ─── 新增交易所：KuCoin ──────────────────────────────────────
async function fetchKuCoin() {
  try {
    const res = await fetch(
      'https://www.kucoin.com/_api/cms/articles?page=1&pageSize=15&category=listing&lang=en_US',
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'HashSpring/1.0' } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.items || data?.data?.items || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.title || '',
      link: a.path ? `https://www.kucoin.com${a.path}` : 'https://www.kucoin.com/news',
      pubDate: a.publishDate ? new Date(a.publishDate).toISOString() : new Date().toISOString(),
      description: a.summary || a.title || '',
      source: 'KuCoin',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ KuCoin 失败: ${e.message}`);
    return [];
  }
}

// ─── 新增交易所：HTX (Huobi) ─────────────────────────────────
async function fetchHTX() {
  try {
    const res = await fetch(
      'https://www.htx.com/-/x/hbg/v1/office/notice/list?page=1&limit=15&lang=en-us',
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'HashSpring/1.0' } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.title || '',
      link: a.link || `https://www.htx.com/support/en-us/detail/${a.id || ''}`,
      pubDate: a.ctime ? new Date(a.ctime).toISOString() : new Date().toISOString(),
      description: a.title || '',
      source: 'HTX',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ HTX 失败: ${e.message}`);
    return [];
  }
}

// ─── 新增交易所：Upbit（韩国，实时推送） ─────────────────────
async function fetchUpbit() {
  try {
    // Upbit 使用公告列表 API
    const res = await fetch(
      'https://api-manager.upbit.com/api/v1/notices?page=1&per_page=15&thread_name=general',
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'HashSpring/1.0' } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data?.list || data?.data || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.title || '',
      link: a.view_url || `https://upbit.com/service_center/notice?id=${a.id || ''}`,
      pubDate: a.created_at || a.updated_at || new Date().toISOString(),
      description: a.title || '',
      source: 'Upbit',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ Upbit 失败: ${e.message}`);
    return [];
  }
}

// ─── 新增交易所：Bithumb（韩国，实时推送） ───────────────────
async function fetchBithumb() {
  try {
    const res = await fetch(
      'https://www.bithumb.com/react/operation/api/notice?page=1&per_page=15&board_id=1',
      { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'HashSpring/1.0' } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data?.list || data?.data || [];
    return (Array.isArray(items) ? items : []).map(a => ({
      title: a.title || '',
      link: a.dtl_link || `https://en.bithumb.com/customer_support/info_detail?seq=${a.seq || ''}`,
      pubDate: a.reg_dt || a.created_at || new Date().toISOString(),
      description: a.title || '',
      source: 'Bithumb',
      sourceType: 'exchange',
      lang: 'en',
    }));
  } catch (e) {
    console.warn(`    ⚠️ Bithumb 失败: ${e.message}`);
    return [];
  }
}

// ─── Reddit r/cryptocurrency 热帖抓取 ────────────────────────
/**
 * 抓取 Reddit r/cryptocurrency 的热门帖子
 * 用于每日汇编（Top 10 by upvotes + comments）
 * Reddit JSON API 无需 API Key
 */
export async function fetchRedditCrypto() {
  try {
    const res = await fetch('https://www.reddit.com/r/cryptocurrency/hot.json?limit=50', {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'HashSpring/1.0 (crypto news aggregator)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts = data?.data?.children || [];
    return posts
      .filter(p => !p.data.stickied) // 排除置顶
      .map(p => ({
        title: p.data.title || '',
        link: `https://reddit.com${p.data.permalink}`,
        pubDate: p.data.created_utc ? new Date(p.data.created_utc * 1000).toISOString() : new Date().toISOString(),
        description: (p.data.selftext || '').slice(0, 500),
        source: 'Reddit',
        sourceType: 'social',
        lang: 'en',
        // Reddit 额外元数据（用于排序/汇编）
        upvotes: p.data.ups || 0,
        comments: p.data.num_comments || 0,
        subreddit: p.data.subreddit || 'cryptocurrency',
        author: p.data.author || '',
        awards: p.data.total_awards_received || 0,
        upvoteRatio: p.data.upvote_ratio || 0,
        // 综合热度分 = upvotes + comments * 2 + awards * 10
        engagementScore: (p.data.ups || 0) + (p.data.num_comments || 0) * 2 + (p.data.total_awards_received || 0) * 10,
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore);
  } catch (e) {
    console.warn(`    ⚠️ Reddit 失败: ${e.message}`);
    return [];
  }
}

// ─── Twitter/X KOL 推文抓取框架 ──────────────────────────────
/**
 * Twitter/X KOL 推文抓取
 * 需要 TWITTER_BEARER_TOKEN（X API v2 免费/Basic tier）
 *
 * 关注的 KOL 列表：
 * - @VitalikButerin (Vitalik)
 * - @caborek (CZ, former Binance CEO)
 * - @elikiing (EliKin)
 * - @lookonchain (on-chain analytics)
 * - @whale_alert
 * - @WuBlockchain
 * - @coaborek
 * - @caborek
 * - @inversebrah (CT insider)
 * - @lightcrypto
 *
 * 用户需要在 .env 中配置:
 * TWITTER_BEARER_TOKEN=your_bearer_token
 */
const TWITTER_KOLS = [
  { id: '295218901', handle: 'VitalikButerin' },
  { id: '902926941413453824', handle: 'cz_binance' },
  { id: '361289499', handle: 'SBF_FTX' },
  { id: '1333467482', handle: 'lookonchain' },
  { id: '3457340845', handle: 'whale_alert' },
  { id: '1275900794', handle: 'WuBlockchain' },
  { id: '1346604518233399302', handle: 'inversebrah' },
  { id: '988250704852996096', handle: 'lightcrypto' },
  { id: '1503777412', handle: 'LayerZero_Labs' },
  { id: '2299027954', handle: 'justinsuntron' },
];

export async function fetchTwitterKOL() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    // 无 Token 时静默跳过
    return [];
  }

  const allTweets = [];

  for (const kol of TWITTER_KOLS) {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/users/${kol.id}/tweets?max_results=5&tweet.fields=created_at,public_metrics,text`,
        {
          signal: AbortSignal.timeout(10000),
          headers: { 'Authorization': `Bearer ${bearerToken}` },
        },
      );
      if (!res.ok) {
        // Rate limited 或其他错误，静默跳过
        if (res.status === 429) {
          console.warn(`    ⚠️ Twitter Rate Limited for @${kol.handle}, 等待下一轮`);
          break; // 全部暂停，等下一轮
        }
        continue;
      }
      const data = await res.json();
      const tweets = data?.data || [];
      for (const t of tweets) {
        const metrics = t.public_metrics || {};
        allTweets.push({
          title: `@${kol.handle}: ${(t.text || '').slice(0, 120)}`,
          link: `https://x.com/${kol.handle}/status/${t.id}`,
          pubDate: t.created_at || new Date().toISOString(),
          description: t.text || '',
          source: `Twitter/@${kol.handle}`,
          sourceType: 'social',
          lang: 'en',
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          replies: metrics.reply_count || 0,
        });
      }
      // Twitter rate limit: 间隔 1.5s
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.warn(`    ⚠️ Twitter @${kol.handle} 失败: ${e.message}`);
    }
  }

  return allTweets;
}

// ─── Dune Analytics 趋势查询 ─────────────────────────────────
async function fetchDuneInsights() {
  try {
    // Dune 的 RSS/公开 feed
    const items = await fetchRSS('https://dune.com/blog/rss.xml', 'Dune Analytics', 'en');
    return items.map(i => ({ ...i, sourceType: 'data-analytics' }));
  } catch {
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

// ─── Followin 备用抓取 ──────────────────────────────────────
async function fetchFollowinAPI() {
  try {
    // Followin 快讯 API
    const res = await fetch('https://api.followin.io/feed/list/recommended?page=1&size=20', {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const articles = data?.data?.list || data?.data || [];
    if (!Array.isArray(articles)) return [];
    return articles.map(a => ({
      title: a.title || a.name || '',
      link: a.url || a.originUrl || `https://followin.io/zh/feed/${a.id || ''}`,
      pubDate: a.publishTime || a.createdAt || a.created_at || new Date().toISOString(),
      description: (a.summary || a.content || a.description || '').slice(0, 500),
      source: 'Followin',
      sourceType: 'rss',
      lang: 'zh',
    })).filter(item => item.title.length > 3);
  } catch (e) {
    console.warn(`    ⚠️ Followin API 备用: ${e.message}`);
    return [];
  }
}

// ─── Foresight News 网页 API 备用 ────────────────────────────
async function fetchForesightAPI() {
  try {
    // 尝试 Foresight News 的内部 API（快讯接口）
    const res = await fetch('https://foresightnews.pro/api/v1/news?pageSize=20&pageNo=1', {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://foresightnews.pro/',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const articles = data?.data?.list || data?.data || data?.list || [];
    if (!Array.isArray(articles)) return [];
    return articles.map(a => ({
      title: a.title || a.name || '',
      link: a.url || `https://foresightnews.pro/article/detail/${a.id || ''}`,
      pubDate: a.publishTime || a.createTime || a.created_at || new Date().toISOString(),
      description: (a.summary || a.content || '').slice(0, 500),
      source: 'Foresight News',
      sourceType: 'rss',
      lang: 'zh',
    })).filter(item => item.title.length > 3);
  } catch (e) {
    console.warn(`    ⚠️ Foresight API 备用: ${e.message}`);
    return [];
  }
}

// ─── Free Crypto News (免费，无需 API Key) ─────────────────
async function fetchFreeCryptoNews() {
  try {
    const res = await fetch('https://cryptocurrency.cv/api/news?limit=50&feed=all', {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const articles = Array.isArray(data) ? data : (data?.articles || data?.data || []);
    return articles.map(a => ({
      title: a.title || '',
      link: a.url || a.link || '',
      pubDate: a.published_at || a.pubDate || a.date || new Date().toISOString(),
      description: (a.summary || a.description || '').slice(0, 500),
      source: `FreeCryptoNews/${a.source || 'unknown'}`,
      sourceType: 'aggregator',
      lang: 'en',
    })).filter(item => item.title.length > 5);
  } catch (e) {
    console.warn(`    ⚠️ FreeCryptoNews 失败: ${e.message}`);
    return [];
  }
}

// ─── OpenNews MCP (AI 评分新闻) ────────────────────────────
async function fetchOpenNews() {
  const token = process.env.OPENNEWS_TOKEN;
  if (!token) {
    // 无 token 时尝试公开 RSS
    try {
      const res = await fetch('https://ai.6551.io/open/news/latest?limit=30', {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'HashSpring/1.0' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const articles = Array.isArray(data) ? data : (data?.data || data?.news || []);
      return articles.map(a => ({
        title: a.title || '',
        link: a.url || a.link || '',
        pubDate: a.published_at || a.timestamp || new Date().toISOString(),
        description: (a.summary || a.content || '').slice(0, 500),
        source: 'OpenNews',
        sourceType: 'ai-aggregator',
        lang: 'en',
        aiScore: a.score || a.impact_score || null,
        signal: a.signal || null,
      })).filter(item => item.title.length > 5);
    } catch (e) {
      console.warn(`    ⚠️ OpenNews 失败: ${e.message}`);
      return [];
    }
  }

  try {
    const res = await fetch('https://ai.6551.io/open/news/latest?limit=50', {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'HashSpring/1.0',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const articles = Array.isArray(data) ? data : (data?.data || data?.news || []);
    return articles.map(a => ({
      title: a.title || '',
      link: a.url || a.link || '',
      pubDate: a.published_at || a.timestamp || new Date().toISOString(),
      description: (a.summary || a.content || '').slice(0, 500),
      source: 'OpenNews',
      sourceType: 'ai-aggregator',
      lang: 'en',
      aiScore: a.score || a.impact_score || null,
      signal: a.signal || null,
    })).filter(item => item.title.length > 5);
  } catch (e) {
    console.warn(`    ⚠️ OpenNews 失败: ${e.message}`);
    return [];
  }
}

// ─── 聚合所有源 ─────────────────────────────────────────────
export async function fetchAllSources() {
  const results = await Promise.allSettled([
    // 英文 RSS (27 源：19 原有 + 8 新增)
    ...EN_RSS_SOURCES.map(s => fetchRSS(s.url, s.name, 'en')),
    // 中文媒体 (9 源)
    ...ZH_RSS_SOURCES.map(s => fetchRSS(s.url, s.name, 'zh')),
    // 交易所 (10 源：5 原有 + 5 新增)
    fetchBinance(),
    fetchOKX(),
    fetchBybit(),
    fetchBitget(),
    fetchCoinbase(),
    fetchGateio(),
    fetchKuCoin(),
    fetchHTX(),
    fetchUpbit(),
    fetchBithumb(),
    // 链上 / 数据 (4 源)
    fetchWhaleAlert(),
    fetchSnapshot(),
    fetchDuneInsights(),
    // Foresight News / Followin 备用 API
    fetchForesightAPI(),
    fetchFollowinAPI(),
    // 社交媒体
    fetchRedditCrypto(),
    fetchTwitterKOL(),
    // 聚合器 (2 源)
    fetchFreeCryptoNews(),
    fetchOpenNews(),
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

  return unique.slice(0, 200); // 每次最多处理 200 条
}
