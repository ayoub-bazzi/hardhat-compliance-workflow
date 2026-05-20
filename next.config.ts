import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude optional server-side packages from the Turbopack bundle.
  // They are loaded by Node.js at runtime — install with:
  //   npm install web-push @types/web-push
  serverExternalPackages: ['web-push'],

  async headers() {
    return [
      {
        // Service worker must be served with no-cache headers so guards always
        // get the latest version, and with a strict CSP for the SW script itself.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',  value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

export default nextConfig
