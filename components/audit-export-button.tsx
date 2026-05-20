'use client'

import { Download } from 'lucide-react'

export function AuditExportButton({ companyName }: { companyName: string }) {
  function handlePrint() {
    const reportEl = document.getElementById('golden-thread-report')
    if (!reportEl) return

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Golden Thread Audit Report — ${companyName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #0f172a;
      padding: 40px 48px;
      max-width: 900px;
      margin: 0 auto;
    }
    .report-header {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .report-header h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .report-header .sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .report-header .meta {
      margin-top: 12px;
      display: flex;
      gap: 24px;
      font-size: 12px;
      color: #475569;
    }
    .report-header .meta strong { color: #0f172a; }
    .watermark {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .event {
      display: flex;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .event:last-child { border-bottom: none; }
    .event-index {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .event-body { flex: 1; min-width: 0; }
    .event-type {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #334155;
      margin-bottom: 3px;
    }
    .event-desc {
      font-size: 13px;
      color: #0f172a;
      line-height: 1.5;
    }
    .event-meta {
      margin-top: 5px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 24px 32px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="watermark">🔒 Golden Thread Audit Report — HardHat Compliance</div>
    <h1>${companyName}</h1>
    <div class="sub">Immutable Compliance Audit Ledger</div>
    <div class="meta">
      <span><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</span>
      <span><strong>Standard:</strong> UK Building Safety Act / Gulf Compliance Framework</span>
    </div>
  </div>
  ${reportEl.innerHTML}
  <div class="footer">
    This document is generated from an immutable, append-only audit ledger. Records cannot be edited or deleted after creation.<br/>
    HardHat Compliance — Secure Document Management Platform
  </div>
</body>
</html>`)

    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
    >
      <Download className="h-3.5 w-3.5" />
      Export Audit Shield
    </button>
  )
}
