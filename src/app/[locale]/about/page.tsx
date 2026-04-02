import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const description = locale === 'en'
    ? 'About HashSpring — the global crypto intelligence platform delivering real-time news and market data.'
    : '關於 HashSpring — 全球加密貨幣情報平台，提供即時新聞和市場數據。';
  return {
    title: `${dict.nav[4]} | HashSpring`,
    description,
    alternates: {
      canonical: `https://www.hashspring.com/${locale}/about`,
      languages: { en: 'https://www.hashspring.com/en/about', zh: 'https://www.hashspring.com/zh/about' },
    },
    openGraph: {
      title: `${dict.nav[4]} | HashSpring`,
      description,
      type: 'website',
      url: `https://www.hashspring.com/${locale}/about`,
      siteName: 'HashSpring',
    },
  };
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">
        {isEn ? 'About HashSpring' : '關於 HashSpring'}
      </h1>

      <div className="space-y-6 text-[var(--text-secondary)] text-base leading-relaxed">
        <p>
          {isEn
            ? 'HashSpring is a global crypto intelligence platform delivering real-time news, market data, and in-depth analysis to crypto enthusiasts, traders, and institutions worldwide.'
            : 'HashSpring 是一個全球加密貨幣情報平台，為全球的加密貨幣愛好者、交易員和機構提供即時新聞、市場數據和深度分析。'}
        </p>

        <p>
          {isEn
            ? 'Our mission is to democratize access to high-quality crypto information. We believe that informed participants make better decisions, leading to a healthier and more transparent crypto ecosystem.'
            : '我們的使命是讓每個人都能獲取高品質的加密貨幣資訊。我們相信，資訊充分的參與者能做出更好的決策，從而建立更健康、更透明的加密生態系統。'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-6 border border-[var(--border-color)] text-center">
            <p className="text-3xl font-bold text-blue-500 mb-2">24/7</p>
            <p className="text-sm">{isEn ? 'Real-time Coverage' : '即時報導'}</p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-6 border border-[var(--border-color)] text-center">
            <p className="text-3xl font-bold text-blue-500 mb-2">10+</p>
            <p className="text-sm">{isEn ? 'Languages (EN/ZH)' : '語言版本（中/英）'}</p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-6 border border-[var(--border-color)] text-center">
            <p className="text-3xl font-bold text-blue-500 mb-2">50+</p>
            <p className="text-sm">{isEn ? 'Data Sources' : '數據來源'}</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">
          {isEn ? 'What We Cover' : '我們的報導範圍'}
        </h2>
        <p>
          {isEn
            ? 'From Bitcoin and Ethereum to DeFi, NFTs, Layer 2 solutions, and emerging blockchain ecosystems — our editorial team and AI-powered pipeline monitor hundreds of sources to deliver breaking news within minutes.'
            : '從比特幣和以太坊到 DeFi、NFT、Layer 2 解決方案和新興區塊鏈生態 — 我們的編輯團隊和 AI 驅動的內容管道監控數百個來源，在數分鐘內發佈突發新聞。'}
        </p>

        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">
          {isEn ? 'Contact Us' : '聯繫我們'}
        </h2>
        <p>
          {isEn
            ? 'For press inquiries, partnerships, or advertising, reach us at:'
            : '如有媒體查詢、合作或廣告需求，請聯繫：'}
        </p>
        <p className="text-blue-500 font-medium">contact@hashspring.com</p>

        <div className="flex items-center gap-3 mt-2">
          <a href="https://t.me/hashspringupdate" target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            {isEn ? '📢 Telegram Channel' : '📢 Telegram 頻道'}
          </a>
          <a href="https://twitter.com/hashspring" target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors">
            𝕏 Twitter
          </a>
        </div>

        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-8">
          {isEn ? 'Technology' : '技術架構'}
        </h2>
        <p>
          {isEn
            ? 'HashSpring is built with Next.js 14, Supabase PostgreSQL, and deployed on Vercel. Our AI-powered content pipeline uses Claude to translate and analyze crypto news from 60+ sources in real-time, delivering bilingual coverage 24/7.'
            : 'HashSpring 採用 Next.js 14、Supabase PostgreSQL 構建，部署在 Vercel 上。我們的 AI 內容管道使用 Claude 即時翻譯和分析來自 60+ 來源的加密貨幣新聞，全天候提供雙語報導。'}
        </p>
      </div>
    </div>
  );
}
