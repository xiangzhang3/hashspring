/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n handled via App Router [locale] segment
  images: {
    domains: ['images.unsplash.com'],
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
