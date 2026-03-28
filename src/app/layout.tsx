import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'HashSpring — Crypto Intelligence',
  description: 'Global crypto intelligence platform delivering real-time news, market data, and expert analysis across 20+ languages.',
  keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'web3', 'news', 'flash'],
  openGraph: {
    type: 'website',
    siteName: 'HashSpring',
    title: 'HashSpring — Crypto Intelligence',
    description: 'Real-time crypto news and market intelligence.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hashspring',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
