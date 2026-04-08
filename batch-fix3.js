const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || '/Users/xiangzhang/hashspring-next';

// ============================================================
// FIX 1: FlashDetailClient.tsx — Add Facebook, LinkedIn, Copy share buttons + AI badge
// ============================================================
let detail = fs.readFileSync(path.join(BASE, 'src/app/[locale]/flash/[id]/FlashDetailClient.tsx'), 'utf8');

// Add copied state
detail = detail.replace(
  "const [summaryLoading, setSummaryLoading] = useState(false);",
  `const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);`
);

// Replace share buttons section — add Facebook, LinkedIn, Copy
detail = detail.replace(
  `<div className="flex items-center gap-2">
              <a
                href={\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(article.title)}&url=https://hashspring.com/\${locale}/flash/\${encodeURIComponent(articleId)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
              >
                \u{1D54F}
              </a>
              <a
                href={\`https://t.me/share/url?url=https://hashspring.com/\${locale}/flash/\${encodeURIComponent(articleId)}&text=\${encodeURIComponent(article.title)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
              >
                Telegram
              </a>
            </div>`,
  `<div className="flex items-center gap-2">
              <a
                href={\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(article.title)}&url=https://hashspring.com/\${locale}/flash/\${encodeURIComponent(articleId)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
                title="Share on X"
              >
                \u{1D54F}
              </a>
              <a
                href={\`https://t.me/share/url?url=https://hashspring.com/\${locale}/flash/\${encodeURIComponent(articleId)}&text=\${encodeURIComponent(article.title)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
                title="Share on Telegram"
              >
                TG
              </a>
              <a
                href={\`https://www.facebook.com/sharer/sharer.php?u=https://hashspring.com/\${locale}/flash/\${encodeURIComponent(articleId)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
                title="Share on Facebook"
              >
                FB
              </a>
              <a
                href={\`https://www.linkedin.com/sharing/share-offsite/?url=https://hashspring.com/\${locale}/flash/\${encodeURIComponent(articleId)}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
                title="Share on LinkedIn"
              >
                in
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(\`https://hashspring.com/\${locale}/flash/\${articleId}\`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title={isEn ? 'Copy link' : '复制链接'}
              >
                {copied ? '✓' : (isEn ? 'Copy' : '复制')}
              </button>
            </div>`
);

// Add AI content disclosure badge after the level badge section
detail = detail.replace(
  `{/* Title (H1) */}
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug tracking-tight mb-5 max-w-[680px]">
            {article.title}
          </h1>`,
  `{/* AI Content Disclosure Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/30 text-[11px] font-medium text-purple-600 dark:text-purple-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {isEn ? 'AI-Curated Content' : 'AI 整理内容'}
            </span>
          </div>

          {/* Title (H1) */}
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug tracking-tight mb-5 max-w-[680px]">
            {article.title}
          </h1>`
);

fs.writeFileSync(path.join(BASE, 'src/app/[locale]/flash/[id]/FlashDetailClient.tsx'), detail);
console.log('1/3 FlashDetailClient.tsx — social share + AI badge added');

// ============================================================
// FIX 2: MarketTable.tsx — Replace <img> with Next.js Image
// ============================================================
let marketTable = fs.readFileSync(path.join(BASE, 'src/components/MarketTable.tsx'), 'utf8');

// Add Image import if not present
if (!marketTable.includes("import Image from 'next/image'")) {
  marketTable = marketTable.replace(
    /^(.*?)$/m,
    `$1\nimport Image from 'next/image';`
  );
}

// Replace img tags with Image components
marketTable = marketTable.replace(
  /<img src=\{coin\.image\} alt=\{coin\.name\} className="w-6 h-6 rounded-full" \/>/g,
  `<Image src={coin.image} alt={coin.name} width={24} height={24} className="w-6 h-6 rounded-full" unoptimized />`
);

fs.writeFileSync(path.join(BASE, 'src/components/MarketTable.tsx'), marketTable);
console.log('2/3 MarketTable.tsx — img replaced with next/image');

// ============================================================
// FIX 3: TrendingCoins.tsx — Replace <img> with Next.js Image
// ============================================================
let trending = fs.readFileSync(path.join(BASE, 'src/components/TrendingCoins.tsx'), 'utf8');

// Add Image import if not present
if (!trending.includes("import Image from 'next/image'")) {
  trending = trending.replace(
    /^(.*?)$/m,
    `$1\nimport Image from 'next/image';`
  );
}

// Replace img tags with Image components
trending = trending.replace(
  /<img src=\{coin\.thumb\} alt=\{coin\.name\} className="w-6 h-6 rounded-full" \/>/g,
  `<Image src={coin.thumb} alt={coin.name} width={24} height={24} className="w-6 h-6 rounded-full" unoptimized />`
);

fs.writeFileSync(path.join(BASE, 'src/components/TrendingCoins.tsx'), trending);
console.log('3/3 TrendingCoins.tsx — img replaced with next/image');

// ============================================================
// FIX 4: next.config.mjs — Add external image domains for next/image
// ============================================================
let nextConfig = fs.readFileSync(path.join(BASE, 'next.config.mjs'), 'utf8');

nextConfig = nextConfig.replace(
  `images: {
    domains: ['images.unsplash.com'],
  },`,
  `images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'www.google.com' },
    ],
  },`
);

fs.writeFileSync(path.join(BASE, 'next.config.mjs'), nextConfig);
console.log('4/4 next.config.mjs — image domains added');

// ============================================================
// FIX 5: Copy og-image.png to public/ (if running locally, generate placeholder)
// ============================================================
const ogPath = path.join(BASE, 'public/og-image.png');
if (!fs.existsSync(ogPath)) {
  console.log('5/5 og-image.png — needs to be added to public/ manually');
} else {
  console.log('5/5 og-image.png — already exists');
}

console.log('\n=== All batch-fix3 patches applied ===');
