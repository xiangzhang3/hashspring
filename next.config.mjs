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
  async headers() {
    return [
      // Short URL for Telegram: /s/abc123 → /api/s/abc123
      { source: '/s/:hash', destination: '/api/s/:hash' },
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Short URL for Telegram: /s/abc123 → /api/s/abc123
      { source: '/s/:hash', destination: '/api/s/:hash' },
      // Default locale redirect
      { source: '/', destination: '/en' },
    ];
  },
};

export default nextConfig;
