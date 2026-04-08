/**
 * Content Filter Module for HashSpring Worker
 * 
 * Blocks problematic URLs from being re-inserted by the RSS scraper,
 * and validates price claims in article titles against real market data.
 * 
 * Created: 2026-04-05
 * Reference: MEMORY-content-pipeline-rules.md
 */

// —— URL Blocklist ————————————————————————————————————
// URLs that match any pattern below will be silently dropped.
// Add new entries when a bad article keeps getting re-scraped.
const BLOCKED_URL_PATTERNS = [
    'newsbtc.com/news/bitcoin/bitcoin-breakdown-to-45000',
    // Add more blocked URL patterns here as needed
  ];

// —— Title Pattern Blocklist ——————————————————————————
// Titles matching these patterns are likely outdated price predictions.
// They will be dropped unless the price deviation check passes.
const SUSPICIOUS_TITLE_PATTERNS = [
    /breakdown\s+to\s+\$[\d,]+/i,
    /breakout\s+to\s+\$[\d,]+/i,
    /drops?\s+to\s+\$[\d,]+/i,
    /crash(?:es|ing)?\s+to\s+\$[\d,]+/i,
    /target\s+(?:of\s+)?\$[\d,]+/i,
  ];

/**
 * Check if an item should be blocked based on URL or title patterns.
 * @param {Object} item - RSS feed item with .link and .title
 * @returns {boolean} true if the item should be blocked
 */
export function isBlockedContent(item) {
    const link = (item.link || '').toLowerCase();

  // Check URL blocklist
  if (BLOCKED_URL_PATTERNS.some(pattern => link.includes(pattern))) {
        return true;
  }

  // Check suspicious title patterns
  const title = item.title || '';
    if (SUSPICIOUS_TITLE_PATTERNS.some(pattern => pattern.test(title))) {
          return true;
    }

  return false;
}

/**
 * Filter an array of items, removing any that match the blocklist.
 * Logs blocked items for debugging.
 * @param {Array} items - Array of RSS feed items
 * @returns {Array} Filtered array with blocked items removed
 */
export function applyContentFilter(items) {
    const before = items.length;
    const filtered = items.filter(item => {
          if (isBlockedContent(item)) {
                  console.log(` 🚫 Blocked: "${(item.title || '').slice(0, 60)}..." (${item.link || 'no link'})`);
                  return false;
          }
          return true;
    });

  const blocked = before - filtered.length;
    if (blocked > 0) {
          console.log(` 🛡️ Content filter: blocked ${blocked} item(s) from ${before} total`);
    }

  return filtered;
}

/**
 * Validate that a price mentioned in a title is not wildly off from current market.
 * Rule: >20% deviation = mark as Opinion, >50% = discard entirely.
 * 
 * @param {string} title - Article title
 * @param {string} coin - Coin symbol (e.g. 'BTC', 'ETH')
 * @param {number} currentPrice - Current market price
 * @returns {{ valid: boolean, reason?: string, action?: string }}
 */
export function validatePriceInTitle(title, coin, currentPrice) {
    if (!currentPrice || currentPrice <= 0) return { valid: true };

  const priceMatch = title.match(/\$([0-9,.]+)/);
    if (!priceMatch) return { valid: true };

  const mentionedPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (isNaN(mentionedPrice) || mentionedPrice <= 0) return { valid: true };

  const deviation = Math.abs(mentionedPrice - currentPrice) / currentPrice;

  if (deviation > 0.5) {
        return {
                valid: false,
                reason: `${coin} price deviation ${(deviation * 100).toFixed(0)}% — mentioned $${mentionedPrice.toLocaleString()}, current $${currentPrice.toLocaleString()}`,
                action: 'discard'
        };
  }

  if (deviation > 0.2) {
        return {
                valid: true,
                reason: `${coin} deviation ${(deviation * 100).toFixed(0)}% — mark as Opinion/Analysis, not IMPORTANT`,
                action: 'downgrade'
        };
  }

  return { valid: true };
}
