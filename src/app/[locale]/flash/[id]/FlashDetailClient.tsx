'use client';

import { useState, useEffect } from 'react';
import type { Locale, Dictionary } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';
import { FlashFeed } from '@/components/FlashFeed';
import { LogoBadge } from '@/components/Logo';
import { LBankAd300x250 } from '@/components/LBankAd';
import { MarketWidget } from '@/components/MarketWidget';
import { MarketHeatmap } from '@/components/MarketHeatmap';
import Link from 'next/link';

interface Props {
  locale: Locale;
  articleId: string;
  dict: Dictionary;
}

// ── Coin keyword detection for inline links ──
const COIN_KEYWORDS: Record<string, { slug: string; display: string }> = {
  'bitcoin': { slug: 'bitcoin', display: 'Bitcoin (BTC)' },
  'btc': { slug: 'bitcoin', display: 'Bitcoin (BTC)' },
  '比特币': { slug: 'bitcoin', display: 'Bitcoin (BTC)' },
  'ethereum': { slug: 'ethereum', display: 'Ethereum (ETH)' },
  'eth': { slug: 'ethereum', display: 'Ethereum (ETH)' },
  '以太坊': { slug: 'ethereum', display: 'Ethereum (ETH)' },
  'solana': { slug: 'solana', display: 'Solana (SOL)' },
  'sol': { slug: 'solana', display: 'Solana (SOL)' },
  'bnb': { slug: 'exchange', display: 'BNB' },
  'xrp': { slug: 'exchange', display: 'XRP' },
  'cardano': { slug: 'defi', display: 'Cardano (ADA)' },
  'dogecoin': { slug: 'meme', display: 'Dogecoin (DOGE)' },
  'doge': { slug: 'meme', display: 'Dogecoin (DOGE)' },
  'binance': { slug: 'exchange', display: 'Binance' },
  'coinbase': { slug: 'exchange', display: 'Coinbase' },
  'sec': { slug: 'regulation', display: 'SEC' },
  'defi': { slug: 'defi', display: 'DeFi' },
  'nft': { slug: 'nft', display: 'NFT' },
};

function detectCoins(title: string): Array<{ slug: string; display: string }> {
  const found: Array<{ slug: string; display: string }> = [];
  const seen = new Set<string>();
  const lower = title.toLowerCase();
  for (const [keyword, info] of Object.entries(COIN_KEYWORDS)) {
    if (lower.includes(keyword.toLowerCase()) && !seen.has(info.slug)) {
      found.push(info);
      seen.add(info.slug);
    }
  }
  return found.slice(0, 4);
}

// ── Sanitize article body: strip JSON-LD, HTML, scripts ──
function sanitizeBody(raw: string): string {
  if (!raw) return '';
  let text = raw;
  // Remove <script> and <style> blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove JSON-LD blocks {"@context":"https://schema.org",...}
  text = text.replace(/\{[\s]*"@context"\s*:\s*"https?:\/\/schema\.org"[\s\S]*?\}(?:\s*\})*\s*/g, '');
  text = text.replace(/\{[\s]*"@type"\s*:[\s\S]*?\}(?:\s*\})*\s*/g, '');
  // Remove large JSON-like blobs (>200 chars inside braces)
  text = text.replace(/\{[^{}]{200,}\}/g, '');
  // Convert block HTML to newlines, strip remaining tags
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
  // Clean whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text.length < 20 ? '' : text;
}

// ── Extract source domain for display ──
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function findArticleById(items: FlashItem[], id: string) {
  const decodedId = decodeURIComponent(id);
  const idx = items.findIndex(item => item.id === decodedId);
  if (idx !== -1) {
    return {
      article: items[idx],
      prevArticle: idx > 0 ? items[idx - 1] : null,
      nextArticle: idx < items.length - 1 ? items[idx + 1] : null,
      related: items
        .filter((item, i) => i !== idx && item.category === items[idx].category)
        .slice(0, 5),
      moreNews: items.filter((_, i) => i !== idx).slice(0, 5),
    };
  }
  return { article: null, prevArticle: null, nextArticle: null, related: [], moreNews: items.slice(0, 5) };
}

export default function FlashDetailClient({ locale, articleId, dict }: Props) {
  const isEn = locale === 'en';
  const [article, setArticle] = useState<FlashItem | null>(null);
  const [prevArticle, setPrevArticle] = useState<FlashItem | null>(null);
  const [nextArticle, setNextArticle] = useState<FlashItem | null>(null);
  const [related, setRelated] = useState<FlashItem[]>([]);
  const [moreNews, setMoreNews] = useState<FlashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summaryParagraphs, setSummaryParagraphs] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/flash-news?locale=${locale}`);
        if (res.ok) {
          const items: FlashItem[] = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            const result = findArticleById(items, articleId);
            if (result.article) {
              setArticle(result.article);
              setPrevArticle(result.prevArticle);
              setNextArticle(result.nextArticle);
              setRelated(result.related.length > 0 ? result.related : result.moreNews);
              setMoreNews(result.moreNews);
              setLoading(false);

              // 优先使用 Supabase 中预生成的 body 正文（先清理 JSON-LD / HTML 垃圾）
              const art = result.article;
              const cleanBody = sanitizeBody(art.body || '');
              if (cleanBody.length > 30) {
                const paragraphs = cleanBody.split(/\n\s*\n/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                setSummaryParagraphs(paragraphs);
              } else {
                // Fallback：实时从原文 URL 抓取 + AI 生成（兜底方案）
                if (art.link) {
                  setSummaryLoading(true);
                  try {
                    const summaryRes = await fetch(
                      `/api/article-summary?url=${encodeURIComponent(art.link)}&locale=${locale}&title=${encodeURIComponent(art.title)}`
                    );
                    if (summaryRes.ok) {
                      const summaryData = await summaryRes.json();
                      if (summaryData.paragraphs && summaryData.paragraphs.length > 0) {
                        setSummaryParagraphs(summaryData.paragraphs);
                      }
                    }
                  } catch {
                    // Summary not available — that's ok
                  } finally {
                    setSummaryLoading(false);
                  }
                }
              }
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch article:', e);
      }
      setError(true);
      setLoading(false);
    }
    fetchData();
  }, [locale, articleId]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mt-8" />
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !article) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">{isEn ? 'Article Not Found' : '文章未找到'}</h1>
        <p className="text-gray-500 mb-6">
          {isEn
            ? 'This flash news item may have expired or the link is invalid.'
            : '該快訊可能已過期或連結無效。'}
        </p>
        <Link href={`/${locale}/flashnews`} className="text-blue-500 hover:underline">
          {isEn ? 'View All Flash News →' : '查看全部快訊 →'}
        </Link>
      </div>
    );
  }

  const detectedCoins = detectCoins(article.title);
  const sourceDomain = article.link ? extractDomain(article.link) : '';
  const publishTime = new Date().toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    datePublished: publishTime,
    dateModified: publishTime,
    author: { '@type': 'Organization', name: 'HashSpring', url: 'https://www.hashspring.com' },
    publisher: {
      '@type': 'Organization',
      name: 'HashSpring',
      url: 'https://www.hashspring.com',
      logo: { '@type': 'ImageObject', url: 'https://www.hashspring.com/favicon.ico' },
    },
    description: article.title,
    mainEntityOfPage: `https://www.hashspring.com/${locale}/flash/${articleId}`,
    articleSection: article.category,
    keywords: [article.category, 'crypto', 'blockchain', ...(detectedCoins.map(c => c.display))].join(', '),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-5 pt-4">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href={`/${locale}`} className="text-gray-400 no-underline hover:text-gray-600">{dict.home}</Link>
          <span>/</span>
          <Link href={`/${locale}/flashnews`} className="text-gray-400 no-underline hover:text-gray-600">{dict.flash}</Link>
          <span>/</span>
          <Link href={`/${locale}/category/${article.category.toLowerCase()}`} className="text-[#0066FF] no-underline hover:underline">{article.category}</Link>
        </nav>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10">

        {/* ═══ LEFT: Article Content ═══ */}
        <article>
          {/* Level Badge + Category + Time */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`text-white text-xs font-extrabold px-3 py-1 rounded ${
              article.level === 'red' ? 'bg-red-500' : article.level === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
              {article.level === 'red'
                ? (isEn ? 'BREAKING' : '突发')
                : article.level === 'orange'
                  ? (isEn ? 'IMPORTANT' : '重要')
                  : (isEn ? 'FLASH' : '快讯')}
            </span>
            <Link href={`/${locale}/category/${article.category.toLowerCase()}`} className="text-sm text-[#0066FF] font-medium no-underline hover:underline">
              {article.category}
            </Link>
            <span className="text-sm text-gray-400">{article.time}</span>
          </div>

          {/* AI Content Disclosure Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/30 text-xs font-medium text-purple-600 dark:text-purple-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {isEn ? 'AI-Curated Content' : 'AI 整理内容'}
            </span>
          </div>

          {/* AI Content Disclosure Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/30 text-[11px] font-medium text-purple-600 dark:text-purple-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {isEn ? 'AI-Curated Content' : 'AI 整理内容'}
            </span>
          </div>

          {/* Title (H1) */}
          <h1 className="text-[28px] sm:text-[32px] font-extrabold leading-snug tracking-tight mb-5 max-w-[680px]">
            {article.title}
          </h1>

          {/* Author + Publish info + Share */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-[680px]">
            <div className="flex items-center gap-3">
              <LogoBadge size={36} />
              <div>
                <div className="text-sm font-bold">HashSpring</div>
                <div className="text-xs text-gray-400">{article.time}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=https://www.hashspring.com/${locale}/flash/${encodeURIComponent(articleId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
              >
                𝕏
              </a>
              <a
                href={`https://t.me/share/url?url=https://www.hashspring.com/${locale}/flash/${encodeURIComponent(articleId)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
              >
                TG
              </a>
              
                href={`https://www.facebook.com/sharer/sharer.php?u=https://www.hashspring.com/${locale}/flash/${encodeURIComponent(articleId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
                title="Share on Facebook"
              >
                FB
              </a>
              
                href={`https://www.linkedin.com/sharing/share-offsite/?url=https://www.hashspring.com/${locale}/flash/${encodeURIComponent(articleId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
                title="Share on LinkedIn"
              >
                in
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://www.hashspring.com/${locale}/flash/${articleId}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title={isEn ? 'Copy link' : '复制链接'}
              >
                {copied ? '✓' : (isEn ? 'Copy' : '复制')}
              </button>
            </div>
          </div>

          {/* ═══ Article Body — 内容聚合区 ═══ */}
          <div className="max-w-[680px] mb-8">

            {/* 正文内容框 — 富文本排版引擎 */}
            <div className="bg-gray-50 dark:bg-[#0F1119] border border-gray-200 dark:border-[#1C1F2E] rounded-xl p-6 sm:p-8 mb-6">

              {/* 來源引用 */}
              <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isEn
                  ? `Source: ${article.source || 'Third-party media'} · Curated by HashSpring`
                  : `來源：${article.source || '第三方媒體'} · HashSpring 整理`}
              </p>

              {/* 正文渲染 — 支持 Markdown 格式 */}
              {summaryLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                  <div className="h-3 bg-transparent rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10/12" />
                </div>
              ) : summaryParagraphs.length > 0 ? (
                <div className="article-body space-y-4">
                  {summaryParagraphs.map((para, idx) => {
                    const trimmed = para.trim();

                    {/* 隐藏 HTML 注释标记 */}
                    if (trimmed.startsWith('<!--')) return null;

                    {/* ## 标题 → 分区标题卡片 */}
                    if (trimmed.startsWith('## ')) {
                      const heading = trimmed.replace(/^##\s*/, '');
                      return (
                        <div key={idx} className="flex items-center gap-2 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700/50">
                          <h3 className="text-base sm:text-[17px] font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                            {heading}
                          </h3>
                        </div>
                      );
                    }

                    {/* 列表块 — 多个 • 开头的行 */}
                    if (trimmed.includes('\n•') || trimmed.startsWith('•')) {
                      const listItems = trimmed.split('\n').filter(l => l.trim().startsWith('•'));
                      return (
                        <div key={idx} className="space-y-2 pl-1">
                          {listItems.map((item, li) => {
                            const text = item.replace(/^•\s*/, '').trim();
                            {/* 解析 [text](url) 链接 */}
                            const linkMatch = text.match(/^(.*?)\s*\[→\]\((.*?)\)\s*$/);
                            return (
                              <div key={li} className="flex items-start gap-2.5 py-1.5 px-3 rounded-lg bg-white dark:bg-[#161928] border border-gray-100 dark:border-gray-800/50">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                <span className="text-[14px] leading-relaxed text-gray-700 dark:text-gray-300 flex-1">
                                  {linkMatch ? (
                                    <>
                                      {linkMatch[1]}
                                      <a href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-blue-500 hover:text-blue-600 text-[12px] no-underline hover:underline">
                                        ↗
                                      </a>
                                    </>
                                  ) : text}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    {/* 编号列表 — 1. 2. 3. 开头 */}
                    if (/^\d+\.\s/.test(trimmed)) {
                      const listItems = trimmed.split('\n').filter(l => /^\d+\.\s/.test(l.trim()) || l.trim().startsWith('   '));
                      return (
                        <div key={idx} className="space-y-3 pl-1">
                          {listItems.map((item, li) => {
                            const numMatch = item.match(/^(\d+)\.\s*(.*)/);
                            if (!numMatch) {
                              return <p key={li} className="text-[13px] text-gray-500 dark:text-gray-400 pl-8 leading-relaxed">{item.trim()}</p>;
                            }
                            const linkMatch = item.match(/🔗\s*(https?:\/\/[^\s]+)/);
                            return (
                              <div key={li} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-white dark:bg-[#161928] border border-gray-100 dark:border-gray-800/50">
                                <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                                  {numMatch[1]}
                                </span>
                                <div className="flex-1">
                                  <p className="text-[14px] leading-relaxed text-gray-700 dark:text-gray-300">{numMatch[2]}</p>
                                  {linkMatch && (
                                    <a href={linkMatch[1]} target="_blank" rel="noopener noreferrer" className="text-[12px] text-blue-500 hover:underline no-underline mt-1 block">
                                      {linkMatch[1].slice(0, 50)}...
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    {/* 斜体免责声明 */}
                    if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
                      return (
                        <p key={idx} className="text-[12px] text-gray-400 dark:text-gray-500 italic leading-relaxed pt-2 border-t border-gray-200/50 dark:border-gray-700/30">
                          {trimmed.replace(/^\*|\*$/g, '')}
                        </p>
                      );
                    }

                    {/* 来源归属行 */}
                    if (trimmed.startsWith('原文來源') || trimmed.startsWith('Source:') || trimmed.startsWith('📰')) {
                      return (
                        <p key={idx} className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed pt-2">
                          {trimmed}
                        </p>
                      );
                    }

                    {/* 普通段落 */}
                    return (
                      <p key={idx} className="text-base sm:text-[17px] leading-[1.9] text-gray-700 dark:text-gray-300">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {isEn
                    ? `This flash news was reported by ${article.source || 'third-party media'} and curated by HashSpring for the crypto community.`
                    : `該消息由 ${article.source || '第三方媒體'} 報導，HashSpring 對內容進行了收錄與整理。`}
                </p>
              )}
            </div>

            {/* ═══ AI 分析 + 编辑点评 ═══ */}
            {(article.analysis || article.comment) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#0D1025] dark:to-[#111530] border border-blue-200/50 dark:border-indigo-800/30 rounded-xl p-5 sm:p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-[#0066FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {isEn ? 'AI Analysis' : 'AI 分析'}
                  </h3>
                  <span className="text-[10px] font-medium text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    HashSpring AI
                  </span>
                </div>

                {/* 市场影响分析 */}
                {article.analysis && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      {isEn ? 'Market Impact' : '市場影響'}
                    </div>
                    <p className="text-[14px] leading-relaxed text-gray-700 dark:text-gray-300">
                      {article.analysis}
                    </p>
                  </div>
                )}

                {/* 编辑点评 */}
                {article.comment && (
                  <div className={article.analysis ? 'pt-3 border-t border-blue-200/30 dark:border-indigo-700/30' : ''}>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      {isEn ? 'Editor\'s Take' : '編輯點評'}
                    </div>
                    <p className="text-[14px] leading-relaxed text-gray-700 dark:text-gray-300 italic">
                      &ldquo;{article.comment}&rdquo;
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-3">
                  {isEn
                    ? 'AI-generated analysis for reference only. Not investment advice.'
                    : 'AI 生成的分析僅供參考，不構成投資建議。'}
                </p>
              </div>
            )}

            {/* 关联币种标签 — 自动检测文章中的币种 */}
            {detectedCoins.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {isEn ? 'Related Assets' : '相关资产'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {detectedCoins.map((coin) => (
                    <Link
                      key={coin.slug}
                      href={`/${locale}/category/${coin.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 no-underline hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {coin.display}
                    </Link>
                  ))}
                  <Link
                    href={`/${locale}/market`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#0066FF] no-underline hover:underline"
                  >
                    {isEn ? 'View Market →' : '查看行情 →'}
                  </Link>
                </div>
              </div>
            )}

            {/* 内部导航链接 */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Link href={`/${locale}/category/${article.category.toLowerCase()}`} className="text-xs text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? `More ${article.category} News` : `更多${article.category}资讯`} →
              </Link>
              <Link href={`/${locale}/flashnews`} className="text-xs text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? 'All Flash News' : '全部快訊'} →
              </Link>
              <Link href={`/${locale}/market`} className="text-xs text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? 'Live Market' : '即時行情'} →
              </Link>
            </div>

            {/* ═══ 原文連結區 ═══ */}
            {article.link && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-500 mb-2">
                    {isEn
                      ? 'This article was originally published by the following source. HashSpring has curated this content for informational purposes.'
                      : '本文最初由以下來源發布，HashSpring 對該內容進行了收錄整理，僅供參考。'}
                  </p>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Favicon */}
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${sourceDomain}&sz=32`}
                        alt={sourceDomain}
                        className="w-4 h-4 rounded flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {article.source || sourceDomain}
                      </span>
                    </div>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066FF] text-white text-xs font-bold no-underline hover:bg-[#0055DD] transition-colors flex-shrink-0"
                    >
                      {isEn ? 'Read Original' : '閱讀原文'}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 免責聲明 */}
            <div className="text-[11px] text-gray-400 leading-relaxed px-1">
              {isEn
                ? 'Disclaimer: This content is aggregated from third-party sources for informational purposes only. HashSpring does not guarantee the accuracy or completeness of the information. This does not constitute investment advice. Please conduct your own research.'
                : '免責聲明：本內容來源於第三方媒體，HashSpring 僅作收錄整理，不保證資訊的準確性或完整性。本文不構成投資建議，請自行研究判斷。'}
            </div>
          </div>

          {/* ═══ Tags ═══ */}
          <div className="flex flex-wrap gap-2 mb-8 max-w-[680px]">
            {[article.category, 'Crypto', isEn ? 'Flash News' : '快讯', ...(detectedCoins.map(c => c.display))].map((tag) => (
              <Link
                key={tag}
                href={`/${locale}/flashnews?q=${encodeURIComponent(tag)}`}
                className="text-xs font-medium text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          {/* ═══ Prev / Next ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6 mb-8">
            {prevArticle ? (
              <Link
                href={`/${locale}/flash/${encodeURIComponent(prevArticle.id)}`}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-[11px] font-semibold text-gray-400 mb-2">← {dict.prevLabel}</div>
                <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">{prevArticle.title}</div>
              </Link>
            ) : <div />}
            {nextArticle ? (
              <Link
                href={`/${locale}/flash/${encodeURIComponent(nextArticle.id)}`}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline text-right hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-[11px] font-semibold text-gray-400 mb-2">{dict.nextLabel} →</div>
                <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">{nextArticle.title}</div>
              </Link>
            ) : <div />}
          </div>

          {/* ═══ Related Flash News ═══ */}
          {related.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-800 dark:border-gray-200">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-lg font-extrabold tracking-tight">
                  {isEn ? 'Related Flash News' : '相关快讯'}
                </h2>
              </div>
              <FlashFeed items={related} locale={locale} adLabel={dict.adLabel} />
            </div>
          )}
        </article>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <aside className="flex flex-col gap-6">
          <div className="sticky top-20 flex flex-col gap-6">
            <LBankAd300x250 label={dict.adLabel} locale={locale} />
            <MarketWidget dict={dict} />
            <MarketHeatmap locale={locale} />
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h3 className="text-[17px] font-bold mb-1">{dict.sectionNewsletter}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{dict.newsletterDesc}</p>
              <input placeholder={dict.emailPh} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm mb-2 outline-none focus:border-[#0066FF]" />
              <button className="w-full px-4 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD]">{dict.subscribeCta}</button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
