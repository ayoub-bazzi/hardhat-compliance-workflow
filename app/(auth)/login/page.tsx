'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { HardHat, AlertCircle, CheckCircle2 } from 'lucide-react'
import { signIn, signUp, type AuthState } from '@/app/auth/actions'

const initialState: AuthState = { error: null }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Please wait…' : label}
    </Button>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export default function LoginPage() {
  const [signInState, signInAction] = useActionState(signIn, initialState)
  const [signUpState, signUpAction] = useActionState(signUp, initialState)

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
              HardHat Compliance
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              The Automated Gatekeeper for Construction Payments
            </p>
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          {/* ── Sign In ── */}
          <TabsContent value="login">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Welcome back</CardTitle>
                <CardDescription>Sign in to your account to continue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={signInAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  {signInState.error && <ErrorAlert message={signInState.error} />}
                  <SubmitButton label="Sign In" />
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Create Account ── */}
          <TabsContent value="register">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Create an account</CardTitle>
                <CardDescription>
                  Get started with HardHat Compliance today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={signUpAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      name="full_name"
                      type="text"
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      name="company_name"
                      type="text"
                      placeholder="Smith Construction LLC"
                      required
                    />
                  </div>

                  {/* Role selector */}
                  <div className="space-y-2">
                    <Label>I am a…</Label>
                    <RadioGroup
                      name="role"
                      defaultValue="gc"
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="role-gc"
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 has-[[data-state=checked]]:border-slate-900 has-[[data-state=checked]]:bg-slate-50"
                      >
                        <RadioGroupItem value="gc" id="role-gc" className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium leading-none">
                            General Contractor
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Manage projects &amp; subs
                          </p>
                        </div>
                      </Label>
                      <Label
                        htmlFor="role-sub"
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 has-[[data-state=checked]]:border-slate-900 has-[[data-state=checked]]:bg-slate-50"
                      >
                        <RadioGroupItem
                          value="subcontractor"
                          id="role-sub"
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium leading-none">Subcontractor</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Submit compliance docs
                          </p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <p className="text-xs text-slate-400">Minimum 6 characters</p>
                  </div>

                  {signUpState.error && <ErrorAlert message={signUpState.error} />}
                  {signUpState.message && <SuccessAlert message={signUpState.message} />}
                  <SubmitButton label="Create Account" />
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
