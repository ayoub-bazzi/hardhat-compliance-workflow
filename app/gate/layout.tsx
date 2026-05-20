import { PwaRegister } from '@/components/pwa-register'

// Gate route group layout.
// Keeps the gate verify page completely standalone (no dashboard chrome),
// while injecting the PWA service worker registration and manifest link.

export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister />
      {children}
    </>
  )
}
