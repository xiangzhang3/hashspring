import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';

const GA_MEASUREMENT_ID = 'G-Q6J10E4NXN';

export const metadata: Metadata = {
  title: 'HashSpring — Crypto Intelligence',
  description:
    'Global crypto intelligence platform delivering real-time news, market data, and expert analysis across 20+ languages.',
  keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'web3', 'news', 'flash'],
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'HashSpring',
    title: 'HashSpring — Crypto Intelligence',
    description: 'Real-time crypto news and market intelligence.',
    images: [{ url: 'https://www.hashspring.com/og-image.png', width: 1200, height: 630, alt: 'HashSpring' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hashspring',
    images: ['https://www.hashspring.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
        <meta name="theme-color" content="#0066FF" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
