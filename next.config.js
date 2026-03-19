/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Prevent caching of HTML pages — ensures browser always fetches
        // the latest entry point with correct JS bundle hashes
        source: '/((?!_next/static|_next/image|icons|.*\\.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webmanifest).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
