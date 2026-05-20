'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDocumentDownloadUrl } from '@/app/gc/projects/[id]/actions'

export function DownloadButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    const { url, error } = await getDocumentDownloadUrl(documentId)
    setLoading(false)

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      console.error('Download error:', error)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDownload}
      disabled={loading}
      title="Download document"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <Download className="h-4 w-4 text-slate-500" />
      )}
    </Button>
  )
}
