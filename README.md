# HashSpring — Crypto Intelligence

Global crypto media platform with multi-language support.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000/en (English) or http://localhost:3000/zh (中文)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── sitemap.ts              # Auto-generated sitemap.xml
│   ├── robots.ts               # robots.txt config
│   └── [locale]/
│       ├── layout.tsx          # Locale layout (Header, Ticker, Footer)
│       ├── page.tsx            # Homepage (FlashNews feed + sidebar)
│       ├── feed.xml/route.ts   # RSS feed per locale
│       └── flash/[id]/page.tsx # FlashNews detail page
├── components/
│   ├── Logo.tsx                # Circle H icon + HS badge + full lockup
│   ├── Header.tsx              # Dark nav bar with search, lang switch
│   ├── Footer.tsx              # Dark footer with links + global sites
│   ├── Ticker.tsx              # Price ticker (CoinGecko API)
│   ├── FlashFeed.tsx           # Flash news timeline list
│   ├── MarketWidget.tsx        # Sidebar market data table
│   ├── Sidebar.tsx             # Right sidebar (ads, market, newsletter)
│   └── ThemeToggle.tsx         # Dark/light mode toggle
├── lib/
│   ├── i18n.ts                 # i18n config + Dictionary type
│   ├── mock-data.ts            # Sample flash news data
│   └── dictionaries/
│       ├── en.json             # English translations
│       └── zh.json             # Chinese translations
└── styles/
    └── globals.css             # Tailwind + CSS variables
scripts/
    └── fetch-news.ts           # RSS crawler + AI translation pipeline
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

## Key Features

- Next.js 14 App Router with SSR/SSG
- i18n via [locale] route segments (en/zh, expandable to 20+)
- CoinGecko real-time price ticker
- SEO: sitemap.xml, robots.txt, RSS feed, NewsArticle schema
- Ad slots: 728x90 leaderboard, 300x250 sidebar, in-feed native
- Light/dark mode
- Responsive typography

## Adding a New Language

1. Create `src/lib/dictionaries/ja.json` (copy from en.json, translate)
2. Add `'ja'` to `locales` array in `src/lib/i18n.ts`
3. Done — accessible at `/ja`
