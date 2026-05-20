'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { HardHat, Building2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createOrganization, type OnboardingState } from './actions'

const SIZES = ['1–10 employees', '11–50 employees', '51–200 employees', '201–500 employees', '500+ employees']

const initial: OnboardingState = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Setting up…' : 'Create My Organization →'}
    </Button>
  )
}

export default function OnboardingPage() {
  const [state, action] = useActionState(createOrganization, initial)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <HardHat className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome to HardHat Compliance
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Let&apos;s set up your organization to get started.
            </p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-700" />
              <CardTitle className="text-lg">Organization Profile</CardTitle>
            </div>
            <CardDescription>
              This creates your private workspace. All projects and data will be scoped to your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Company Name</Label>
                <Input
                  id="org-name"
                  name="name"
                  type="text"
                  placeholder="Acme Construction LLC"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-size">Company Size</Label>
                <Select name="size" required>
                  <SelectTrigger id="org-size">
                    <SelectValue placeholder="Select company size…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {state.error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <SubmitButton />
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Your dashboard will be private and only visible to your organization.
        </p>
      </div>
    </div>
  )
}
