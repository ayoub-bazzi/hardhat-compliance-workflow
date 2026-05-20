import Link from 'next/link'
import { ShieldX, ArrowLeft } from 'lucide-react'

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { from } = await searchParams
  const blockedPath = typeof from === 'string' ? from : null

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100">
          <ShieldX className="h-10 w-10 text-red-500" />
        </div>

        {/* Heading */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-red-500">
          403 — Access Restricted
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          You don&apos;t have permission to view this page
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          Your current role does not grant access to{' '}
          {blockedPath ? (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
              {blockedPath}
            </code>
          ) : (
            'this area'
          )}
          . Contact your administrator to request elevated permissions.
        </p>

        {/* Role legend */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Route Access Requirements
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <span className="font-semibold text-slate-700">Finance Hub</span>
                {' '}— admin, finance
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <span className="font-semibold text-slate-700">Project Insights</span>
                {' '}— admin, finance, project_manager
              </span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/gc/projects"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
