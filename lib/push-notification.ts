// Web Push notification utility for HardHat Compliance.
//
// REQUIRED: npm install web-push @types/web-push
// Then generate VAPID keys: npx web-push generate-vapid-keys
// Add to .env:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
//   VAPID_PRIVATE_KEY=<private key>
//   VAPID_CONTACT_EMAIL=your@email.com
//
// Without the package installed, all push calls degrade to no-ops gracefully.

import { createRequire } from 'node:module'
import { createServiceSupabaseClient } from '@/lib/supabase'

// Minimal interface for the web-push API surface we use.
// Avoids a compile-time type reference to the optional package.
interface WebPushModule {
  setVapidDetails(contactUri: string, publicKey: string, privateKey: string): void
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ): Promise<unknown>
}

// Load web-push via Node.js runtime require so Turbopack does not analyze
// the import statically. Returns null when the package is not installed.
function loadWebPush(): WebPushModule | null {
  try {
    const require = createRequire(import.meta.url)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('web-push') as WebPushModule
  } catch {
    return null
  }
}

export type PushSubscriptionPayload = {
  endpoint: string
  keys: {
    p256dh: string
    auth:   string
  }
}

// ── Send push to all PM/admin subscriptions for an org ────────

export async function sendCriticalScanAlert(
  orgId:       string,
  companyName: string,
  riskScore:   number,
): Promise<void> {
  await sendPushToOrg(
    orgId,
    JSON.stringify({
      title: '🚨 Critical Risk Gate Attempt',
      body:  `${companyName} (Risk: ${riskScore}/100) attempted site entry — access DENIED.`,
      url:   '/gc/site-monitor',
    }),
  )
}

// ── Shared inner sender ───────────────────────────────────────

async function sendPushToOrg(
  orgId:   string,
  payload: string,
): Promise<void> {
  const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidContact    = process.env.VAPID_CONTACT_EMAIL ?? 'admin@hardhat.com'
  if (!vapidPublicKey || !vapidPrivateKey) return

  const service = createServiceSupabaseClient()
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('subscription_json')
    .eq('organization_id', orgId)

  if (!subs || subs.length === 0) return

  const webpush = loadWebPush()
  if (!webpush) return

  webpush.setVapidDetails(`mailto:${vapidContact}`, vapidPublicKey, vapidPrivateKey)

  await Promise.allSettled(
    subs.map((sub) => {
      const s = sub.subscription_json as { endpoint: string; keys: { p256dh: string; auth: string } }
      return webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, payload)
    })
  )
}

// ── Send impersonation alert ──────────────────────────────────

export async function sendImpersonationAlert(
  orgId:       string,
  companyName: string,
  matchScore:  number,
): Promise<void> {
  await sendPushToOrg(
    orgId,
    JSON.stringify({
      title: '⚠️ Suspected Impersonation',
      body:  `${companyName} — live photo did not match registered worker (confidence ${matchScore}%). Verify immediately.`,
      url:   '/gc/site-monitor',
    }),
  )
}

// ── Store a new subscription ──────────────────────────────────
// Called from the /api/push/subscribe route after the browser
// creates a PushSubscription object.

export function serializeSubscription(sub: PushSubscription): PushSubscriptionPayload | null {
  try {
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
    return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }
  } catch {
    return null
  }
}
