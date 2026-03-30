import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';

const GA_MEASUREMENT_ID = 'G-Q6J10E4NXN';

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
                        </Script>Script>
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                        <link
                                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;700&display=swap"
                                    rel="stylesheet"
                                  />
                </head>head>
                <body className="antialiased">
                  {children}
                </body>body>
          </html>html>
        );
    
}
</html>
