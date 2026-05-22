'use client'

import { useState, useEffect } from 'react'
import {
  User, ShieldCheck, Lock, Check, X, Loader2, Mail, KeyRound,
  TerminalSquare, Info, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Languages,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { updateProfile, sendPasswordReset, getSystemLogs } from './settings-actions'
import { useLanguage } from '@/components/language-provider'
import type { SystemLog, SystemLogLevel } from '@/types/database.types'

// ── Toggle switch ──────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Integration status pill ────────────────────────────────────

function IntegrationStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">
            {configured ? 'API key detected in environment' : 'No API key found in environment'}
          </p>
        </div>
      </div>
      {configured ? (
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <Check className="h-3 w-3" /> Configured
        </span>
      ) : (
        <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          <X className="h-3 w-3" /> Not configured
        </span>
      )}
    </div>
  )
}

// ── Compliance rules ───────────────────────────────────────────

type ComplianceRule = {
  id: string
  label: string
  description: string
  core: boolean
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'coi',
    label: 'Certificate of Insurance (COI)',
    description: 'Proof of general liability and auto coverage.',
    core: true,
  },
  {
    id: 'w9',
    label: 'W-9 Form',
    description: 'Federal tax identification for all subcontractors.',
    core: true,
  },
  {
    id: 'certified_payroll',
    label: 'Certified Payroll',
    description: 'Weekly prevailing wage compliance reports.',
    core: true,
  },
  {
    id: 'workers_comp',
    label: "Workers' Compensation",
    description: 'Insurance certificate covering workplace injuries.',
    core: false,
  },
  {
    id: 'lien_waiver',
    label: 'Lien Waiver',
    description: 'Conditional or unconditional mechanic lien waivers.',
    core: false,
  },
  {
    id: 'safety_training',
    label: 'Safety Training Certificate',
    description: 'OSHA 10 or 30 hour completion card.',
    core: false,
  },
]

const RULES_STORAGE_KEY = 'hc:compliance_rules'

function useComplianceRules() {
  const defaults: Record<string, boolean> = Object.fromEntries(
    COMPLIANCE_RULES.map((r) => [r.id, r.core])
  )
  const [enabled, setEnabled] = useState<Record<string, boolean>>(defaults)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RULES_STORAGE_KEY)
      if (stored) setEnabled({ ...defaults, ...JSON.parse(stored) })
    } catch { /* ignore parse errors */ }
    setHydrated(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setEnabled((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { enabled, toggle, hydrated }
}

// ── System log row ─────────────────────────────────────────────

function LogLevelBadge({ level }: { level: SystemLogLevel }) {
  if (level === 'error') {
    return <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100 text-[10px] px-1.5 py-0">Error</Badge>
  }
  if (level === 'warn') {
    return <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5 py-0">Warn</Badge>
  }
  return <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0">Info</Badge>
}

function LogRow({ log }: { log: SystemLog }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <LogLevelBadge level={log.level} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{log.event}</p>
          <time className="shrink-0 text-[11px] text-slate-400">
            {new Date(log.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </time>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{log.message}</p>
      </div>
    </div>
  )
}

// ── Feedback banner ────────────────────────────────────────────

type FeedbackState = 'idle' | 'loading' | 'success' | 'error'

function FeedbackBanner({
  state,
  successMsg,
  errorMsg,
}: {
  state: FeedbackState
  successMsg: string
  errorMsg?: string
}) {
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
        <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMsg ?? 'Something went wrong. Please try again.'}
      </div>
    )
  }
  return null
}

// ── Section wrapper ────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Tab 1: Profile ─────────────────────────────────────────────

function ProfileTab({
  fullName: initName,
  companyName: initCompany,
  email,
  resendConfigured,
}: {
  fullName: string
  companyName: string
  email: string
  resendConfigured: boolean
}) {
  const [fullName,    setFullName]    = useState(initName)
  const [companyName, setCompanyName] = useState(initCompany)
  const [profileState, setProfileState] = useState<FeedbackState>('idle')
  const [profileError, setProfileError] = useState('')

  async function handleSave() {
    setProfileState('loading')
    const result = await updateProfile({ fullName, companyName })
    if (result.success) {
      setProfileState('success')
    } else {
      setProfileError(result.error ?? 'Update failed.')
      setProfileState('error')
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile form */}
      <Section title="Personal Information" description="Update how you appear across the platform.">
        <div className="grid gap-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setProfileState('idle') }}
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setProfileState('idle') }}
              placeholder="Acme Construction LLC"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="opacity-70 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400">
              Email is managed by your auth provider and cannot be changed here.
            </p>
          </div>
        </div>

        <FeedbackBanner
          state={profileState}
          successMsg="Profile updated successfully."
          errorMsg={profileError}
        />

        <div>
          <Button
            onClick={handleSave}
            disabled={profileState === 'loading'}
            className="bg-slate-900 hover:bg-slate-700 text-white"
          >
            {profileState === 'loading' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              'Save Profile'
            )}
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Integrations */}
      <Section title="Integrations" description="Third-party services connected to your account.">
        <IntegrationStatus label="Resend (Email Notifications)" configured={resendConfigured} />
      </Section>
    </div>
  )
}

// ── Tab 2: Compliance Rules ────────────────────────────────────

function ComplianceRulesTab() {
  const { enabled, toggle, hydrated } = useComplianceRules()
  const [rulesSaved, setRulesSaved] = useState(false)

  function handleSaveRules() {
    setRulesSaved(true)
    setTimeout(() => setRulesSaved(false), 3000)
  }

  return (
    <div className="space-y-8">
      <Section
        title="Mandatory Document Requirements"
        description="Control which document types are required for subcontractor compliance. These rules drive AI review and the safety pass system."
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Core requirements</strong> are always enforced and cannot be disabled. Additional requirements are saved to this browser and will persist per session until database configuration is available.
          </p>
        </div>

        <div className="space-y-2">
          {COMPLIANCE_RULES.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-4"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{rule.label}</p>
                  {rule.core && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-medium text-slate-500">
                      Core
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{rule.description}</p>
              </div>

              <Toggle
                checked={hydrated ? (enabled[rule.id] ?? rule.core) : rule.core}
                onChange={() => { if (!rule.core) toggle(rule.id) }}
                disabled={rule.core}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveRules}
            className="bg-slate-900 hover:bg-slate-700 text-white"
          >
            {rulesSaved ? (
              <><Check className="mr-2 h-4 w-4" /> Saved</>
            ) : (
              'Save Rules'
            )}
          </Button>
          {rulesSaved && (
            <p className="text-sm text-emerald-700">Rules saved to this browser.</p>
          )}
        </div>
      </Section>
    </div>
  )
}

// ── Tab 3: Security ────────────────────────────────────────────

function SecurityTab() {
  const [resetState, setResetState]   = useState<FeedbackState>('idle')
  const [resetError, setResetError]   = useState('')

  const [logsOpen,   setLogsOpen]     = useState(false)
  const [logsState,  setLogsState]    = useState<'idle' | 'loading' | 'loaded'>('idle')
  const [logs,       setLogs]         = useState<SystemLog[]>([])

  async function handlePasswordReset() {
    setResetState('loading')
    const result = await sendPasswordReset()
    if (result.success) {
      setResetState('success')
    } else {
      setResetError(result.error ?? 'Could not send reset email.')
      setResetState('error')
    }
  }

  async function handleLoadLogs() {
    if (!logsOpen) {
      setLogsOpen(true)
      if (logsState === 'idle') {
        setLogsState('loading')
        const data = await getSystemLogs()
        setLogs(data)
        setLogsState('loaded')
      }
    } else {
      setLogsOpen(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Password reset */}
      <Section
        title="Password"
        description="Trigger a secure password reset link sent to your registered email."
      >
        <FeedbackBanner
          state={resetState}
          successMsg="Reset link sent — check your inbox."
          errorMsg={resetError}
        />

        <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <KeyRound className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Reset Password</p>
            <p className="mt-0.5 text-xs text-slate-500">
              We will email a secure link to change your password. You will remain signed in.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handlePasswordReset}
            disabled={resetState === 'loading' || resetState === 'success'}
          >
            {resetState === 'loading' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
            ) : (
              'Send Reset Email'
            )}
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Audit logs */}
      <Section
        title="Audit Logs"
        description="System events recorded by the Ghost Assistant (cron job) and other automated processes."
      >
        <button
          type="button"
          onClick={handleLoadLogs}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <TerminalSquare className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {logsState === 'loaded' ? `${logs.length} events loaded` : 'View System Audit Logs'}
              </p>
              <p className="text-xs text-slate-500">Last 50 system events from the cron engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logsState === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            {logsOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>

        {logsOpen && (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {logsState === 'loading' && (
              <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading logs…
              </div>
            )}

            {logsState === 'loaded' && logs.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
                <TerminalSquare className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">No audit logs yet.</p>
                <p className="text-xs text-slate-400">
                  Logs appear after the first cron run.
                </p>
              </div>
            )}

            {logsState === 'loaded' && logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Tab 4: Language ────────────────────────────────────────────

function LanguageTab() {
  const { locale, setLocale } = useLanguage()
  const [saved, setSaved] = useState(false)

  function choose(l: 'en' | 'ar') {
    setLocale(l)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <Section
        title="Display Language"
        description="Choose the language used across the dashboard. Your preference is saved locally."
      >
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
            {locale === 'ar' ? 'تم تحديث اللغة' : 'Language updated'}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Root export ────────────────────────────────────────────────

export function SettingsTabs({
  fullName,
  companyName,
  email,
  resendConfigured,
}: {
  fullName: string
  companyName: string
  email: string
  resendConfigured: boolean
}) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">
          <User className="h-4 w-4" /> Profile
        </TabsTrigger>
        <TabsTrigger value="rules">
          <ShieldCheck className="h-4 w-4" /> Compliance Rules
        </TabsTrigger>
        <TabsTrigger value="security">
          <Lock className="h-4 w-4" /> Security
        </TabsTrigger>
        <TabsTrigger value="language">
          <Languages className="h-4 w-4" /> Language
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="rounded-xl border border-slate-200 bg-white p-6">
        <ProfileTab
          fullName={fullName}
          companyName={companyName}
          email={email}
          resendConfigured={resendConfigured}
        />
      </TabsContent>

      <TabsContent value="rules" className="rounded-xl border border-slate-200 bg-white p-6">
        <ComplianceRulesTab />
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
