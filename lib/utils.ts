import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AI_REASON_MAP: Record<string, string> = {
  'AI could not extract an expiry date from the document': 'Expiry date could not be read from this document',
  'AI returned an unrecognised date format': 'Expiry date format was not recognised',
  'AI could not extract a company name from the document': 'Company name could not be read from this document',
  'AI could not locate the General Liability coverage section': 'General Liability coverage section was not found',
  'AI found the Liability section but could not identify a dollar amount': 'Liability coverage amount could not be determined',
  'AI found a limit but the text was too blurry to verify': 'Coverage amount was unclear — document may be low resolution',
  'expiry_date: not found': 'Expiry date could not be read from this document',
  'liability_limit_usd: not found': 'Liability coverage amount could not be determined',
  'company_name: not found': 'Company name could not be read from this document',
}

export async function callGeminiWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = 30_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Gemini request timed out — please try again in 30 seconds')),
      timeoutMs,
    )
  })
  try {
    return await Promise.race([fn(), timeout])
  } finally {
    clearTimeout(timer!)
  }
}

export function formatRejectionReason(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/;\s*/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => AI_REASON_MAP[r] ?? r)
}
