import type { FlashItem } from '@/components/FlashFeed';

export const ALL_CATEGORIES = ['All', 'Analysis', 'BTC', 'ETH', 'DeFi', 'NFT', 'L2', 'Policy', 'SOL', 'Stable', 'AI', 'Exchange'];

export const CATEGORY_ZH: Record<string, string> = {
  All: '全部', Analysis: '分析', Policy: '政策', Exchange: '交易所', Stable: '穩定幣',
};

// ─── Client-side safety filter: hide individual exchange items ───
const DIGEST_ONLY_EXCHANGES_CLIENT = new Set([
  'Bitget', 'LBank', 'KuCoin', 'MEXC', 'Gate.io', 'HTX',
  'Coinbase', 'Bybit', 'Upbit', 'Bithumb', 'Hyperliquid', 'Aster',
]);
const IS_DIGEST_TITLE_CLIENT = /daily\s*digest|每日[匯汇]總|每日摘要/i;
const EXCHANGE_TITLE_RE = /kucoin|bitget|lbank|gate\.io|htx|huobi|bybit|upbit|bithumb|hyperliquid|aster/i;
const LISTING_KEYWORD_RE = /上[市线線]|登[陆陸]|首[发發]|listing|delist|将上线|已上线|新增|兑换|convert|perpetual|合约|期货/i;

export function filterDigestOnlyExchanges(items: FlashItem[]): FlashItem[] {
  return items.filter(item => {
    const title = item.title || '';
    if (IS_DIGEST_TITLE_CLIENT.test(title)) return true;
    if (item.source && DIGEST_ONLY_EXCHANGES_CLIENT.has(item.source)) return false;
    if (EXCHANGE_TITLE_RE.test(title) && LISTING_KEYWORD_RE.test(title)) return false;
    return true;
  });
}

// ─── Sound notification using Web Audio API ───
export function playNotificationSound(level: 'red' | 'orange' | 'blue' = 'blue') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (level === 'red') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (level === 'orange') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Web Audio not available
  }
}

// ─── Desktop notification for breaking news ───
export function sendDesktopNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'hashspring-flash',
      requireInteraction: false,
    });
  }
}
