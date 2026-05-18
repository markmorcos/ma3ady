/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // The repo-root eslint config targets the React Native app and isn't
  // applicable here. The Next workspace ships its own focused config
  // (eslint.config.js below) — we still type-check via tsc.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'x-frame-options', value: 'DENY' },
          { key: 'x-content-type-options', value: 'nosniff' },
          { key: 'referrer-policy', value: 'no-referrer-when-downgrade' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
