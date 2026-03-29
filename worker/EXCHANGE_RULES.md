# HashSpring Exchange Content Rules

## Core Rule

**Only Binance and OKX publish individual (real-time) news items.**
All other exchanges MUST use daily digest reports only.

## Exchange Classification

### Real-time (individual items)
| Exchange | Source Name | Notes |
|----------|-------------|-------|
| Binance | `Binance`, `Binance Alpha`, `Binance Futures` | Listings + announcements |
| OKX | `OKX` | Listings + announcements |

### Daily Digest Only (NO individual items)
| Exchange | Source Name | Digest Time (UTC) |
|----------|-------------|-------------------|
| Bybit | `Bybit` | 09:00 |
| Bitget | `Bitget` | 09:05 |
| Coinbase | `Coinbase` | 09:10 |
| Gate.io | `Gate.io` | 09:15 |
| KuCoin | `KuCoin` | 09:20 |
| HTX | `HTX` | 09:25 |
| LBank | `LBank` | 09:30 |
| MEXC | `MEXC` | 09:35 |
| Upbit | `Upbit` | 09:40 |
| Bithumb | `Bithumb` | 09:45 |
| Hyperliquid | `Hyperliquid` | 09:50 |
| Aster | `Aster` | 09:55 |

## Implementation Checklist (when adding a new exchange)

1. **`worker/sources.js`**: Add `fetchXxx()` function, add to `fetchAllSources()`
2. **`worker/index.js` > `RATE_LIMITED_SOURCES`**: Add `'Xxx': { maxPerWindow: 0, listingOnly: false }`
3. **`worker/index.js` > `DIGEST_SCHEDULE`**: Add `{ name: 'Xxx', hour: 9, minute: XX }`
4. **`worker/index.js` > `REALTIME_EXCHANGES`**: Do NOT add (only Binance/OKX belong here)
5. **Update this document**

## Rationale

- Prevents feed spam from minor exchange listings
- Consolidates information into readable daily summaries
- Only top-tier exchanges (Binance, OKX) warrant real-time individual items
- Daily digests are generated at UTC 09:00-09:55, staggered 5 minutes apart to avoid API rate limits
