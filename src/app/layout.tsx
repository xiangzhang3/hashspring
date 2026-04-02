import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-noto',
});

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
    <html suppressHydrationWarning className={`${inter.variable} ${notoSansTC.variable}`}>
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
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
