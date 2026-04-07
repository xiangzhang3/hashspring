import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';

const GA_MEASUREMENT_ID = 'G-Q6J10E4NXN';

export const metadata: Metadata = {
  metadataBase: new URL('https://hashspring.com'),
  title: {
    default: 'HashSpring — Real-Time Crypto News, Bitcoin Analysis & Market Intelligence',
    template: '%s | HashSpring',
  },
  description:
    'Stay ahead with HashSpring: real-time crypto flash news, Bitcoin cycle analysis, DeFi insights, and market data. Breaking blockchain updates delivered in English & Chinese.',
  keywords: [
    'crypto news', 'bitcoin analysis', 'cryptocurrency market', 'blockchain news',
    'defi', 'web3', 'bitcoin price', 'ethereum', 'crypto flash news',
    'bitcoin cycle analysis', 'crypto market intelligence', 'BTC', 'ETH',
  ],
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  alternates: {
    canonical: 'https://hashspring.com',
    languages: {
      'en': 'https://hashspring.com/en',
      'zh': 'https://hashspring.com/zh',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'HashSpring',
    title: 'HashSpring — Real-Time Crypto News & Bitcoin Analysis',
    description: 'Breaking crypto news, Bitcoin market cycle analysis, and DeFi intelligence. Updated every minute.',
    images: [{ url: 'https://hashspring.com/og-image.png', width: 1200, height: 630, alt: 'HashSpring — Crypto Intelligence Platform' }],
    locale: 'en_US',
    alternateLocale: ['zh_TW'],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hashspring',
    title: 'HashSpring — Crypto News & Bitcoin Analysis',
    description: 'Real-time crypto flash news and market intelligence.',
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large' as const,
    'max-video-preview': -1,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' as const },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* RSS Feed Discovery */}
        <link rel="alternate" type="application/rss+xml" title="HashSpring News (English)" href="/en/feed.xml" />
        <link rel="alternate" type="application/rss+xml" title="HashSpring 快訊 (中文)" href="/zh/feed.xml" />
        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://skfpuzlnhkoyifewvisz.supabase.co" />
        <link rel="dns-prefetch" href="https://www.okx.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Organization + WebSite JSON-LD for Google Knowledge Panel & Sitelinks Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://hashspring.com/#organization',
                  name: 'HashSpring',
                  url: 'https://hashspring.com',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://hashspring.com/icon-192.png',
                    width: 192,
                    height: 192,
                  },
                  sameAs: ['https://twitter.com/hashspring'],
                  description: 'Real-time crypto news, Bitcoin analysis, and blockchain market intelligence platform.',
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://hashspring.com/#website',
                  url: 'https://hashspring.com',
                  name: 'HashSpring',
                  publisher: { '@id': 'https://hashspring.com/#organization' },
                  inLanguage: ['en', 'zh-TW'],
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://hashspring.com/en/flashnews?q={search_term_string}',
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
