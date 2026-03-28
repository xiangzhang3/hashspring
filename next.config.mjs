/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n handled via App Router [locale] segment
  images: {
    domains: ['images.unsplash.com'],
  },
  async headers() {
    return [
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
      // Default locale redirect
      { source: '/', destination: '/en' },
    ];
  },
};

export default nextConfig;
