'use client'

import { useState, useTransition } from 'react'
import { Download, FileText, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchReportData, fetchAuditCsvData, type ReportData } from './report-actions'

// ── Colour constants mirroring dashboard theme ─────────────────
const COLOR = {
  amber:   [245, 158,  11] as [number, number, number],
  slate900:[15,  23,  42] as [number, number, number],
  slate700:[51,  65,  85] as [number, number, number],
  slate500:[100, 116, 139] as [number, number, number],
  slate200:[226, 232, 240] as [number, number, number],
  white:   [255, 255, 255] as [number, number, number],
  emerald: [16,  185, 129] as [number, number, number],
  red:     [239,  68,  68] as [number, number, number],
  amber50: [255, 251, 235] as [number, number, number],
}

function riskColor(score: number): [number, number, number] {
  if (score < 31) return COLOR.emerald
  if (score < 71) return [245, 158, 11]
  return COLOR.red
}

function statusColor(status: string): [number, number, number] {
  if (status === 'compliant')     return COLOR.emerald
  if (status === 'non_compliant') return COLOR.red
  return [245, 158, 11]
}

// ── PDF builder ────────────────────────────────────────────────

async function buildPdf(data: ReportData): Promise<void> {
  const { jsPDF }   = await import('jspdf')
  const autoTable   = (await import('jspdf-autotable')).default

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW   = doc.internal.pageSize.getWidth()
  const LINE = 0.3

  function setFont(size: number, style: 'normal' | 'bold' = 'normal') {
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
  }

  function sectionHeader(title: string, y: number): number {
    doc.setFillColor(...COLOR.slate900)
    doc.rect(14, y, PW - 28, 7, 'F')
    setFont(9, 'bold')
    doc.setTextColor(...COLOR.white)
    doc.text(title.toUpperCase(), 18, y + 4.8)
    return y + 11
  }

  let y = 0

  // ── HEADER BAND ────────────────────────────────────────────
  doc.setFillColor(...COLOR.amber)
  doc.rect(0, 0, PW, 28, 'F')

  setFont(18, 'bold')
  doc.setTextColor(...COLOR.slate900)
  doc.text('HardHat Compliance', 14, 12)

  setFont(9)
  doc.setTextColor(...COLOR.slate900)
  doc.text('Executive Compliance Report', 14, 18)
  doc.text(data.orgName, 14, 23)

  setFont(8)
  doc.setTextColor(...COLOR.slate700)
  const rangeStr = `Period: ${data.dateFrom} → ${data.dateTo}`
  doc.text(rangeStr, PW - 14, 12, { align: 'right' })
  const genStr = `Generated: ${new Date(data.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
  doc.text(genStr, PW - 14, 18, { align: 'right' })

  y = 34

  // ── SECTION 1: COMPLIANCE OVERVIEW ──────────────────────────
  y = sectionHeader('Section 1 — Compliance Overview', y)

  const { metrics } = data
  const overviewRows = [
    ['Total Subcontractors',   String(metrics.totalSubs)],
    ['Compliant',              String(metrics.compliantSubs)],
    ['Non-Compliant',          String(metrics.nonCompliantSubs)],
    ['Global Compliance Rate', `${metrics.globalCompliancePct}%`],
    ['Inducted Workers',       `${metrics.inductedSubs} / ${metrics.totalSubs}`],
    ['Docs Expiring (30 days)', String(metrics.totalExpiringDocs)],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: overviewRows,
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: COLOR.slate700, textColor: COLOR.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: COLOR.slate900 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 'auto', fontStyle: 'bold',
           textColor: metrics.globalCompliancePct >= 70 ? COLOR.emerald : COLOR.red },
    },
    tableLineColor: COLOR.slate200,
    tableLineWidth: LINE,
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ── SECTION 2: RISK REGISTER ─────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20 }
  y = sectionHeader('Section 2 — Risk Register (Top Subcontractors by Risk)', y)

  const riskRows = data.topRisks.map((r) => [
    r.company_name,
    r.project_name,
    r.compliance_status === 'compliant' ? 'Compliant' :
    r.compliance_status === 'non_compliant' ? 'At Risk' : 'Warning',
    String(r.risk_score),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Company', 'Project', 'Status', 'Risk Score']],
    body: riskRows.length > 0 ? riskRows : [['No subcontractors', '—', '—', '—']],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: COLOR.slate700, textColor: COLOR.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: COLOR.slate900 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 65 },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto', fontStyle: 'bold' },
    },
    tableLineColor: COLOR.slate200,
    tableLineWidth: LINE,
    didParseCell(hookData) {
      if (hookData.column.index === 2 && hookData.section === 'body') {
        const status = data.topRisks[hookData.row.index]?.compliance_status ?? ''
        hookData.cell.styles.textColor = statusColor(status)
      }
      if (hookData.column.index === 3 && hookData.section === 'body') {
        const score = data.topRisks[hookData.row.index]?.risk_score ?? 0
        hookData.cell.styles.textColor = riskColor(score)
      }
    },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ── SECTION 3: SITE ATTENDANCE ────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20 }
  y = sectionHeader('Section 3 — Site Presence & Gate Activity', y)

  const attRows = data.attendance.map((a) => [
    new Date(a.scan_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    String(a.granted_count),
    String(a.denied_count),
    String(a.granted_count + a.denied_count),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Granted', 'Denied', 'Total Scans']],
    body: attRows.length > 0 ? attRows : [['No gate activity in period', '—', '—', '—']],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: COLOR.slate700, textColor: COLOR.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: COLOR.slate900 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { textColor: COLOR.emerald, fontStyle: 'bold' },
      2: { textColor: COLOR.red,     fontStyle: 'bold' },
    },
    tableLineColor: COLOR.slate200,
    tableLineWidth: LINE,
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ── SECTION 4: AUDIT TRAIL ───────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20 }
  y = sectionHeader('Section 4 — Audit Trail (Last 10 Events)', y)

  const auditRows = data.auditTrail.map((e) => [
    new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    e.event_type,
    e.actor,
    e.description.length > 60 ? e.description.slice(0, 57) + '…' : e.description,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Timestamp', 'Event Type', 'Actor', 'Description']],
    body: auditRows.length > 0 ? auditRows : [['No audit events', '—', '—', '—']],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: COLOR.slate700, textColor: COLOR.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: COLOR.slate900 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 32 },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' },
    },
    tableLineColor: COLOR.slate200,
    tableLineWidth: LINE,
  })

  // ── FOOTER on every page ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...COLOR.slate200)
    doc.setLineWidth(0.4)
    doc.line(14, pageH - 12, PW - 14, pageH - 12)
    setFont(7)
    doc.setTextColor(...COLOR.slate500)
    doc.text('HardHat Compliance — Confidential. Generated by automated reporting engine.', 14, pageH - 7)
    doc.text(`Page ${p} of ${totalPages}`, PW - 14, pageH - 7, { align: 'right' })
  }

  const fileName = `HardHat_Compliance_Report_${data.dateFrom}_${data.dateTo}.pdf`
  doc.save(fileName)
}

// ── CSV helper ─────────────────────────────────────────────────

function buildCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape  = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Date helpers ───────────────────────────────────────────────

function today():   string { return new Date().toISOString().split('T')[0] }
function minus7():  string {
  const d = new Date(); d.setDate(d.getDate() - 6)
  return d.toISOString().split('T')[0]
}
function minus30(): string {
  const d = new Date(); d.setDate(d.getDate() - 29)
  return d.toISOString().split('T')[0]
}

// ── Main component ─────────────────────────────────────────────

export function ReportClient() {
  const [dateFrom,  setDateFrom]  = useState(minus7)
  const [dateTo,    setDateTo]    = useState(today)
  const [pdfPending, startPdf]   = useTransition()
  const [csvPending, startCsv]   = useTransition()
  const [feedback,  setFeedback]  = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function handleQuickRange(from: string) {
    setDateFrom(from)
    setDateTo(today())
  }

  function handleGeneratePdf() {
    setFeedback(null)
    startPdf(async () => {
      const res = await fetchReportData(dateFrom, dateTo)
      if (!res.ok) {
        setFeedback({ type: 'error', msg: res.error })
        return
      }
      await buildPdf(res.data)
      setFeedback({ type: 'success', msg: 'PDF downloaded.' })
    })
  }

  function handleExportCsv() {
    setFeedback(null)
    startCsv(async () => {
      const res = await fetchAuditCsvData()
      if (!res.ok) {
        setFeedback({ type: 'error', msg: res.error })
        return
      }
      const csv = buildCsv(res.rows as unknown as Array<Record<string, unknown>>)
      downloadBlob(csv, `HardHat_Audit_Export_${today()}.csv`, 'text/csv')
      setFeedback({ type: 'success', msg: `Exported ${res.rows.length} audit events as CSV.` })
    })
  }

  const isLoading = pdfPending || csvPending

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Report Period</h2>

        {/* Quick presets */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: 'Last 7 days',  from: minus7()  },
            { label: 'Last 30 days', from: minus30() },
            { label: 'Last 90 days', from: (() => { const d = new Date(); d.setDate(d.getDate() - 89); return d.toISOString().split('T')[0] })() },
          ].map(({ label, from }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleQuickRange(from)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                dateFrom === from && dateTo === today()
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={today()}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Export actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Generate Report</h2>
        <p className="mb-5 text-xs text-slate-400">
          PDF includes compliance overview, risk register, site attendance, and audit trail.
          CSV exports the full audit ledger for legal or insurance review.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleGeneratePdf}
            disabled={isLoading}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            {pdfPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building PDF…</>
              : <><FileText className="mr-2 h-4 w-4" /> Download PDF Report</>
            }
          </Button>

          <Button
            onClick={handleExportCsv}
            disabled={isLoading}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {csvPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting…</>
              : <><Download className="mr-2 h-4 w-4" /> Export Full Audit CSV</>
            }
          </Button>
        </div>

        {feedback && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}>
            {feedback.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertTriangle className="h-4 w-4 shrink-0" />
            }
            {feedback.msg}
          </div>
        )}
      </div>

      {/* What's included */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">PDF Contents</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { num: '01', title: 'Compliance Overview', desc: 'Total workers, compliance %, inducted count, docs expiring' },
            { num: '02', title: 'Risk Register',       desc: 'Top 10 subcontractors ranked by risk score with status' },
            { num: '03', title: 'Site Attendance',     desc: 'Gate activity by day — granted and denied entry counts' },
            { num: '04', title: 'Audit Trail',         desc: 'Last 10 Golden Thread events with actor and timestamp' },
          ].map(({ num, title, desc }) => (
            <div key={num} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                <span className="text-[11px] font-black text-amber-700">{num}</span>
              </div>
              <p className="text-xs font-semibold text-slate-700">{title}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
