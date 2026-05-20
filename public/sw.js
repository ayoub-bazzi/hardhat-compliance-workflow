// HardHat Compliance — Service Worker
// Provides offline-resilient gate verify pages and Web Push notifications.
// Placed in public/ so it is served at the origin root, giving it scope
// over all paths including /gate/verify/*.

const SHELL_CACHE = 'hardhat-shell-v1'
const GATE_CACHE  = 'hardhat-gate-v1'

// ── Install ───────────────────────────────────────────────────
// Pre-cache the offline fallback page immediately on install.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(['/offline'])
    ).catch(() => {
      // /offline page may not exist yet — non-fatal
    })
  )
  // Take control immediately without waiting for old SW to be released.
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────
// Clean up any stale caches from previous versions.

self.addEventListener('activate', (event) => {
  const validCaches = [SHELL_CACHE, GATE_CACHE]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────
// Gate verify pages: network-first, fall back to last-seen cached version.
// All other requests: network-only (no cache bloat on the dashboard).

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin GET requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Gate verify route — network-first with cache fallback.
  if (url.pathname.startsWith('/gate/verify/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a clone of a successful response for offline reuse.
          if (response.ok) {
            const clone = response.clone()
            caches.open(GATE_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          // Offline: serve the last-cached version of this gate URL.
          const cached = await caches.match(request)
          if (cached) return cached

          // No cache hit — serve the generic offline page.
          return (
            (await caches.match('/offline')) ??
            new Response(
              `<!DOCTYPE html><html><body style="background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center">
                <div><p style="font-size:5rem">⚠️</p><h1>Offline</h1><p>No cached gate data. Reconnect to verify access.</p></div>
              </body></html>`,
              { headers: { 'Content-Type': 'text/html' } }
            )
          )
        })
    )
    return
  }

  // All other routes: pass through to network.
  // (Dashboard pages are not cached — they contain live compliance data.)
})

// ── Push ──────────────────────────────────────────────────────
// Receives encrypted push from the server and displays a notification.
// Triggered when a critical-risk sub attempts gate access while GC is offline.

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = { title: 'HardHat Alert', body: 'Gate scan notification.', url: '/gc/site-monitor' }
  try {
    payload = { ...payload, ...event.data.json() }
  } catch {
    payload.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:             payload.body,
      icon:             '/icons/icon-192.png',
      badge:            '/icons/badge-72.png',
      tag:              'gate-critical-alert',
      requireInteraction: true,
      vibrate:          [200, 100, 200, 100, 400],
      data:             { url: payload.url },
      actions: [
        { action: 'view', title: 'View Monitor' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

// ── Notification click ────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url ?? '/gc/site-monitor'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(targetUrl))
        if (existing) return existing.focus()
        return clients.openWindow(targetUrl)
      })
  )
})
