'use client'

import { useEffect } from 'react'

// Registers the service worker at /sw.js on first load.
// This component renders nothing — it is a pure side-effect.
// Place it inside the gate layout (or root layout for full PWA coverage).
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {
        // Registration failure is non-fatal — the app works without the SW.
      })
  }, [])

  return null
}
