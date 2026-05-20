'use client'

import { useEffect, useRef, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProject, type ProjectActionState } from './actions'

const initialState: ProjectActionState = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create Project'}
    </Button>
  )
}

export function AddProjectDialog() {
  const [open, setOpen]           = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [state, formAction]       = useActionState(createProject, initialState)
  const router                    = useRouter()
  const didRedirect                = useRef(false)

  useEffect(() => {
    if (state.success && state.projectId && !didRedirect.current) {
      didRedirect.current = true
      setOpen(false)
      setShowToast(true)
      const timer = setTimeout(() => {
        router.push(`/gc/projects/${state.projectId}`)
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [state.success, state.projectId, router])

  return (
    <>
      {/* Celebratory toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg ring-1 ring-emerald-100 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Project created!</p>
            <p className="text-xs text-slate-500">Taking you there now…</p>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => {
        setOpen(next)
        if (!next) didRedirect.current = false
      }}>
        <DialogTrigger
          render={<Button size="lg" className="gap-2" />}
        >
          <PlusCircle className="h-4 w-4" />
          New Project
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a New Project</DialogTitle>
            <DialogDescription>
              Fill in the basics — you can add more details once the project is open.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                name="name"
                placeholder="e.g. Marrakech Luxury Villas"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-location">Location</Label>
              <Input
                id="project-location"
                name="location"
                placeholder="e.g. Sidi Ghanem"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-email">
                Initial Subcontractor Email{' '}
                <span className="text-xs text-slate-400">(optional)</span>
              </Label>
              <Input
                id="sub-email"
                name="subcontractorEmail"
                type="email"
                placeholder="e.g. partner@company.com"
              />
              <p className="text-xs text-slate-400">
                Start the first compliance invite right away.
              </p>
            </div>

            {state.error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <DialogFooter showCloseButton>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
