import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Services | HardHat Compliance — Construction Compliance SaaS',
  description:
    'AI-powered compliance verification, subcontractor management, and site access control for modern construction teams.',
  openGraph: {
    title: 'HardHat Compliance | Construction SaaS',
    description:
      'Automate COI tracking, AI document verification, and hard-stop site gate access — built for GCs.',
    type: 'website',
  },
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
