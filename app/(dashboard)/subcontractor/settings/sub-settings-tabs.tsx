'use client'

import { useState } from 'react'
import { User, Lock, Loader2, KeyRound, CheckCircle2, AlertTriangle, Languages, Check } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { updateProfile, sendPasswordReset } from '@/app/(dashboard)/gc/settings/settings-actions'
import { useLanguage } from '@/components/language-provider'

type FeedbackState = 'idle' | 'loading' | 'success' | 'error'

function FeedbackBanner({
  state, successMsg, errorMsg,
}: { state: FeedbackState; successMsg: string; errorMsg?: string }) {
  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMsg ?? 'Something went wrong.'}
      </div>
    )
  }
  return null
}

function ProfileTab({ fullName: initName, companyName: initCompany, email }: {
  fullName: string
  companyName: string
  email: string
}) {
  const [fullName,    setFullName]    = useState(initName)
  const [companyName, setCompanyName] = useState(initCompany)
  const [state,       setState]       = useState<FeedbackState>('idle')
  const [error,       setError]       = useState('')

  async function handleSave() {
    setState('loading')
    const result = await updateProfile({ fullName, companyName })
    if (result.success) {
      setState('success')
    } else {
      setError(result.error ?? 'Update failed.')
      setState('error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="sub_full_name">Full Name</Label>
          <Input
            id="sub_full_name"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setState('idle') }}
            placeholder="Jane Smith"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub_company_name">Company Name</Label>
          <Input
            id="sub_company_name"
            value={companyName}
            onChange={(e) => { setCompanyName(e.target.value); setState('idle') }}
            placeholder="Acme Electrical LLC"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub_email">Email Address</Label>
          <Input id="sub_email" value={email} disabled className="opacity-70 cursor-not-allowed" />
          <p className="text-xs text-slate-400">Email cannot be changed here.</p>
        </div>
      </div>

      <FeedbackBanner state={state} successMsg="Profile updated." errorMsg={error} />

      <Button
        onClick={handleSave}
        disabled={state === 'loading'}
        className="bg-slate-900 hover:bg-slate-700 text-white"
      >
        {state === 'loading' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
        ) : (
          'Save Profile'
        )}
      </Button>
    </div>
  )
}

function SecurityTab() {
  const [state, setState] = useState<FeedbackState>('idle')
  const [error, setError] = useState('')

  async function handleReset() {
    setState('loading')
    const result = await sendPasswordReset()
    if (result.success) {
      setState('success')
    } else {
      setError(result.error ?? 'Could not send reset email.')
      setState('error')
    }
  }

  return (
    <div className="space-y-6">
      <FeedbackBanner state={state} successMsg="Reset link sent — check your inbox." errorMsg={error} />

      <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <KeyRound className="h-5 w-5 text-slate-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Reset Password</p>
          <p className="mt-0.5 text-xs text-slate-500">
            A secure reset link will be emailed to your address.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={state === 'loading' || state === 'success'}
        >
          {state === 'loading' ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
          ) : (
            'Send Reset Email'
          )}
        </Button>
      </div>
    </div>
  )
}

function LanguageTab() {
  const { locale, setLocale } = useLanguage()
  const [saved, setSaved] = useState(false)

  function choose(l: 'en' | 'ar') {
    setLocale(l)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-700">Display Language</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose the language used across the portal. Your preference is saved locally.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <button
          type="button"
          onClick={() => choose('en')}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 px-6 py-5 transition-all ${
            locale === 'en'
              ? 'border-slate-900 bg-slate-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span className="text-2xl font-bold tracking-tight text-slate-900">EN</span>
          <span className="text-sm font-medium text-slate-600">English</span>
          {locale === 'en' && (
            <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Check className="h-2.5 w-2.5" /> Active
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => choose('ar')}
          dir="rtl"
          className={`flex flex-col items-center gap-3 rounded-xl border-2 px-6 py-5 transition-all ${
            locale === 'ar'
              ? 'border-amber-500 bg-amber-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span className="text-2xl font-bold tracking-tight text-slate-900">ع</span>
          <span className="text-sm font-medium text-slate-600">العربية</span>
          {locale === 'ar' && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Check className="h-2.5 w-2.5" /> نشط
            </span>
          )}
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 max-w-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {locale === 'ar' ? 'تم تحديد اللغة' : 'Language updated'}
        </div>
      )}
    </div>
  )
}

export function SubSettingsTabs({
  fullName, companyName, email,
}: { fullName: string; companyName: string; email: string }) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">
          <User className="h-4 w-4" /> Profile
        </TabsTrigger>
        <TabsTrigger value="security">
          <Lock className="h-4 w-4" /> Security
        </TabsTrigger>
        <TabsTrigger value="language">
          <Languages className="h-4 w-4" /> Language
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="rounded-xl border border-slate-200 bg-white p-6">
        <ProfileTab fullName={fullName} companyName={companyName} email={email} />
      </TabsContent>

      <TabsContent value="security" className="rounded-xl border border-slate-200 bg-white p-6">
        <SecurityTab />
      </TabsContent>

      <TabsContent value="language" className="rounded-xl border border-slate-200 bg-white p-6">
        <LanguageTab />
      </TabsContent>
    </Tabs>
  )
}
