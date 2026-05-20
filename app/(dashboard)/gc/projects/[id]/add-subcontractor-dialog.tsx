'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { UserPlus, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addSubcontractor,
  type SubcontractorActionState,
} from '@/app/gc/projects/[id]/actions'

const initialState: SubcontractorActionState = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Adding…' : 'Add Subcontractor'}
    </Button>
  )
}

export function AddSubcontractorDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Bind the projectId so the action signature matches useActionState's expectation.
  const boundAction = addSubcontractor.bind(null, projectId)
  const [state, formAction] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      router.refresh()
    }
  }, [state.success, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <UserPlus className="h-4 w-4" />
        Add Subcontractor
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Subcontractor</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              name="company_name"
              placeholder="e.g. Bazzi Electrical"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input
              id="contact-email"
              name="contact_email"
              type="email"
              placeholder="e.g. contact@bazzielectrical.com"
              required
            />
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
  )
}
