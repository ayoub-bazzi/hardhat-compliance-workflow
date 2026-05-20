import Link from 'next/link'
import { ArrowLeft, FolderX } from 'lucide-react'

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <FolderX className="h-8 w-8 text-slate-400" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-slate-900">Project not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        This project doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/gc/projects"
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>
    </div>
  )
}
