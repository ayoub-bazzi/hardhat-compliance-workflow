import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HardHat Compliance',
    short_name: 'HardHat',
    description: 'AI-powered construction compliance — gate control, document audit, payment gating.',
    start_url: '/gate/verify',
    id: 'hardhat-compliance-pwa',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    categories: ['business', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Site Monitor',
        short_name: 'Monitor',
        url: '/gc/site-monitor',
        description: 'Real-time gate scan feed',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Scan Gate',
        short_name: 'Scan',
        url: '/gc/scan',
        description: 'Scan worker QR pass at gate',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Site Journal',
        short_name: 'Journal',
        url: '/gc/journal',
        description: "Upload today's site progress photo",
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    screenshots: [
      {
        src: '/screenshots/gate-monitor.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Gate Monitor — Real-time access control',
      },
      {
        src: '/screenshots/risk-overview.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Risk Overview — Subcontractor compliance scores',
      },
      {
        src: '/screenshots/executive-dashboard.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Executive Dashboard — Board-level compliance overview',
      },
    ],
    prefer_related_applications: false,
    launch_handler: {
      client_mode: ['navigate-existing', 'auto'],
    },
  }
}
