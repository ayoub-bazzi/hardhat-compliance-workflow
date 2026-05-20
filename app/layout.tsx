import type { Metadata } from 'next'
import { Inter, Geist_Mono, Cairo } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const cairo = Cairo({
  variable: '--font-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '900'],
})

export const metadata: Metadata = {
  title: {
    template: '%s | HardHat Compliance',
    default:  'HardHat Compliance — AI-Powered Construction Compliance',
  },
  description:
    'Stop insurance risk before it hits the job site. AI document review, automated expiry alerts, and QR-enforced gate access for General Contractors.',
  metadataBase: new URL('https://hardhat-compliance.app'),
  appleWebApp: {
    capable: true,
    title: 'HardHat',
    statusBarStyle: 'black-translucent',
    startupImage: [
      {
        url: '/icons/splash-2048x2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-1668x2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-1290x2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/icons/splash-1179x2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/icons/splash-1170x2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': 'HardHat',
    'msapplication-TileColor': '#0f172a',
    'msapplication-config': '/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
