import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { callGeminiWithTimeout } from '@/lib/utils'

export const runtime = 'nodejs'

const DISCREPANCY_THRESHOLD_PCT = 5 // flag if more than 5% off

type RequestBody = {
  certId:      string
  photoDataUrl: string  // invoice image as data URL (JPEG/PNG)
}

type GeminiInvoiceResponse = {
  invoice_total:   number | null
  currency:        string
  invoice_number:  string | null
  confidence:      'high' | 'medium' | 'low'
  notes:           string
}

function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  const [header, data] = dataUrl.split(',')
  return { base64: data, mimeType: header.replace('data:', '').replace(';base64', '') }
}

function safeParseJson(raw: string): GeminiInvoiceResponse {
  const cleaned = raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\n?```\s*$/m, '').trim()
  return JSON.parse(cleaned) as GeminiInvoiceResponse
}

async function extractInvoiceAmount(base64: string, mimeType: string): Promise<GeminiInvoiceResponse> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel(
    { model: 'gemini-2.5-flash', generationConfig: { responseMimeType: 'application/json' } },
    { apiVersion: 'v1beta' },
  )

  const result = await callGeminiWithTimeout(() =>
    model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      `You are an AI financial document analyst. Extract the TOTAL AMOUNT DUE from this invoice image or PDF.

Look for:
- "Total", "Total Due", "Amount Due", "Grand Total", "Invoice Total", "Net Total", "Montant Total", "المبلغ الإجمالي"
- The final, bottom-line amount including all taxes and deductions

Return ONLY a valid JSON object:
{
  "invoice_total": <number as float, e.g. 15000.00, or null if not found>,
  "currency": "<3-letter ISO code if identifiable, e.g. USD, MAD, EUR, otherwise 'UNKNOWN'>",
  "invoice_number": "<invoice reference number if visible, otherwise null>",
  "confidence": "high" | "medium" | "low",
  "notes": "<brief note about any ambiguity, or empty string>"
}

Set confidence to "low" if the image is blurry, partially cut off, or the total is ambiguous.
If multiple totals are visible (subtotal, VAT, grand total), extract only the GRAND TOTAL.
Do NOT invent numbers. If unsure, set invoice_total to null.`,
    ])
  )

  return safeParseJson(result.response.text())
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: RequestBody
  try {
    body = await request.json() as RequestBody
    if (!body.certId || !body.photoDataUrl) {
      return Response.json({ error: 'Missing certId or photoDataUrl' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Load the certificate to compare amounts
  const service = createServiceSupabaseClient()
  const { data: cert } = await service
    .from('payment_certificates')
    .select('id, amount, organization_id')
    .eq('id', body.certId)
    .single()

  if (!cert) return Response.json({ error: 'Certificate not found' }, { status: 404 })

  // Gemini extraction
  const { base64, mimeType } = extractBase64(body.photoDataUrl)
  let gemini: GeminiInvoiceResponse
  try {
    gemini = await extractInvoiceAmount(base64, mimeType)
  } catch {
    return Response.json({ error: 'AI extraction unavailable — please try again.' }, { status: 502 })
  }

  // Upload invoice image to storage
  const invoiceId  = crypto.randomUUID()
  const storagePath = `${cert.organization_id}/${body.certId}/${invoiceId}.jpg`
  const buffer      = Buffer.from(base64, 'base64')

  let invoiceUrl: string | null = null
  const { error: uploadError } = await service.storage
    .from('invoice-uploads')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: false })

  if (!uploadError) {
    const { data: signedData } = await service.storage
      .from('invoice-uploads')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year
    invoiceUrl = signedData?.signedUrl ?? null
  }

  // Discrepancy calculation
  const certAmount = cert.amount ?? 0
  const discrepancyFlagged = gemini.invoice_total !== null && certAmount > 0 &&
    Math.abs((gemini.invoice_total - certAmount) / certAmount) * 100 > DISCREPANCY_THRESHOLD_PCT
  const discrepancyPct = gemini.invoice_total !== null && certAmount > 0
    ? Math.abs(((gemini.invoice_total - certAmount) / certAmount) * 100)
    : null

  return Response.json({
    ok:                  true,
    invoice_total:       gemini.invoice_total,
    currency:            gemini.currency,
    invoice_number:      gemini.invoice_number,
    confidence:          gemini.confidence,
    notes:               gemini.notes,
    discrepancy_flagged: discrepancyFlagged,
    discrepancy_pct:     discrepancyPct,
    amount:              certAmount,
    invoice_url:         invoiceUrl,
  })
}
