import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.SITE_PASS_SECRET
if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SITE_PASS_SECRET must be set in production — gate pass tokens cannot be signed securely without it.')
}
const SIGNING_SECRET = SECRET ?? 'dev-insecure-fallback-do-not-use-in-production'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export type SitePassPayload = {
  sub: string // subcontractor_id
  org: string // organization_id — verified server-side at gate
  exp: number // unix ms expiry
  iat: number // unix ms issued-at
}

function b64uEncode(s: string) {
  return Buffer.from(s).toString('base64url')
}

function b64uDecode(s: string) {
  return Buffer.from(s, 'base64url').toString('utf8')
}

export function createSitePassToken(subcontractorId: string, orgId: string): string {
  const payload: SitePassPayload = {
    sub: subcontractorId,
    org: orgId,
    exp: Date.now() + TTL_MS,
    iat: Date.now(),
  }
  const encodedPayload = b64uEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', SIGNING_SECRET).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${sig}`
}

export function verifySitePassToken(token: string): SitePassPayload | null {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx < 1) return null

  const encodedPayload = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)

  const expectedSig = createHmac('sha256', SIGNING_SECRET).update(encodedPayload).digest('base64url')

  try {
    const sigBuf = Buffer.from(sig, 'base64url')
    const expBuf = Buffer.from(expectedSig, 'base64url')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(b64uDecode(encodedPayload)) as SitePassPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
