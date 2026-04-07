/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n handled via App Router [locale] segment
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'www.google.com' },
    ],
  },
  async redirects() {
    return [
      // SEO: www → non-www 301 永久重定向（配合 middleware 双保险）
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.hashspring.com' }],
        destination: 'https://hashspring.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Default locale redirect
      { source: '/', destination: '/en' },
    ];
  },
};

export default nextConfig;
