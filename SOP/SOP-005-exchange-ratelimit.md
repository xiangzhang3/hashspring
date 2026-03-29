# SOP-005: 交易所内容限流规则

> 编号: SOP-005 | 版本: 1.0 | 更新: 2026-03-29

## 规则总表

| 交易所 | 时间窗口 | 最大推送数 | 内容过滤 | 优先级 |
|--------|----------|-----------|---------|--------|
| Bitget | 4小时 | 1条 | 无（全类型可推） | 上线 > 功能 > 下架 > 其他 |
| LBank | 4小时 | 1条 | 仅上线信息 | 上线信息 only |
| Binance | 无限制 | 无限制 | 无 | - |
| OKX | 无限制 | 无限制 | 无 | - |
| Bybit | 无限制 | 无限制 | 无 | - |
| Coinbase | 无限制 | 无限制 | 无 | - |

## 上线信息关键词

```
list, 上线, launch, new pair, trading pair, 开通交易, open trading,
will list, spot listing, perpetual listing, futures listing,
新增交易对, adds, now available
```

## 功能性信息关键词

```
maintenance, upgrade, 维护, 升级, suspend, resume,
暂停, 恢复, deposit, withdraw, 充值, 提币,
airdrop, 空投, fork, snapshot, 快照
```

## 下架信息关键词

```
delist, 下架, remove, removal, 下线
```

## 关键文件

| 文件 | 函数 |
|------|------|
| `worker/index.js` | `applyExchangeRateLimit()` |
| `worker/index.js` | `isListingNews()`, `isDelistingNews()`, `isFunctionalNews()` |
