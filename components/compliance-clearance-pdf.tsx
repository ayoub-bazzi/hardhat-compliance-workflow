'use client'

import { useState, useTransition } from 'react'
import { FileCheck, Loader2, Download, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  subId:         string
  companyName:   string
  riskScore:     number
  isCleared:     boolean
  validDocs:     Array<{ type: string; expiry_date: string | null }>
  orgName:       string
}

const CERT_THRESHOLD = 30

async function buildClearancePdf(props: Props): Promise<void> {
  const { jsPDF }   = await import('jspdf')
  const autoTable   = (await import('jspdf-autotable')).default
  const QRCode      = (await import('qrcode')).default

  const { companyName, riskScore, validDocs, orgName, subId } = props

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()

  // ── HEADER ─────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)  // slate-900
  doc.rect(0, 0, PW, 35, 'F')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(245, 158, 11)  // amber-400
  doc.text('HardHat Compliance', 14, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)  // slate-400
  doc.text('Compliance Clearance Certificate', 14, 21)
  doc.text(orgName, 14, 27)

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Issued: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, PW - 14, 21, { align: 'right' })

  let y = 44

  // ── CLEARED STAMP ───────────────────────────────────────────
  doc.setFillColor(16, 185, 129)  // emerald-500
  doc.setDrawColor(16, 185, 129)
  doc.roundedRect(PW / 2 - 38, y, 76, 22, 4, 4, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('✓  COMPLIANCE CLEARED', PW / 2, y + 13, { align: 'center' })

  y += 32

  // ── COMPANY + RISK SCORE ────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(companyName, PW / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Risk Score: ${riskScore} / 100 — Site Ready`, PW / 2, y, { align: 'center' })

  y += 14

  // ── VALID INSURANCE TABLE ────────────────────────────────────
  const tableRows = validDocs.map((d) => [
    d.type,
    d.expiry_date
      ? new Date(d.expiry_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'No expiry',
    '✓ Valid',
  ])

  autoTable(doc, {
    startY: y,
    head:   [['Document Type', 'Expiry Date', 'Status']],
    body:   tableRows.length > 0 ? tableRows : [['No documents on file', '—', '—']],
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize:  9,
    },
    bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { textColor: [16, 185, 129], fontStyle: 'bold' },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12

  // ── QR CODE ─────────────────────────────────────────────────
  const qrUrl    = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.hardhat.ma'}/gc/risk/${subId}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 200, margin: 1 })

  const qrSize = 36
  const qrX    = PW / 2 - qrSize / 2
  doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Scan to verify on Golden Thread', PW / 2, y + qrSize + 5, { align: 'center' })

  y += qrSize + 14

  // ── LEGAL FOOTER ────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(14, PH - 20, PW - 14, PH - 20)

  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'This certificate is generated from an immutable compliance ledger. Valid at time of issuance only.',
    PW / 2, PH - 14, { align: 'center' },
  )
  doc.text('HardHat Compliance — Secure Document Management Platform', PW / 2, PH - 9, { align: 'center' })

  const fileName = `Compliance_Clearance_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export function ComplianceClearancePdf(props: Props) {
  const [pending, start] = useTransition()
  const [done, setDone]  = useState(false)

  if (!props.isCleared || props.riskScore > CERT_THRESHOLD) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Clearance Certificate Unavailable</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Available only when all documents are verified and risk score ≤ {CERT_THRESHOLD}.
            Current score: {props.riskScore}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Compliance Clearance Certificate</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Attach to physical invoices as proof of compliance clearance.
          </p>
        </div>
      </div>
      <Button
        onClick={() => { setDone(false); start(async () => { await buildClearancePdf(props); setDone(true) }) }}
        disabled={pending}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
      >
        {pending
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building…</>
          : done
          ? <><FileCheck className="mr-2 h-4 w-4" /> Downloaded</>
          : <><Download className="mr-2 h-4 w-4" /> Download PDF</>
        }
      </Button>
    </div>
  )
}
