'use client'

import { useState, useTransition } from 'react'
import {
  UserCog, Mail, Shield, Clock, CheckCircle2, AlertTriangle,
  Loader2, UserPlus, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { updateMemberRole, inviteTeamMember } from './actions'
import type { AppRole } from '@/types/database.types'

// ── Role config ───────────────────────────────────────────────

const GC_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin',           label: 'Admin',           description: 'Full access including team & finance' },
  { value: 'project_manager', label: 'Project Manager', description: 'Projects, insights, and compliance' },
  { value: 'auditor',         label: 'Auditor',         description: 'View-only access across all data' },
  { value: 'finance',         label: 'Finance',         description: 'Finance hub and payment ledger' },
]

const ROLE_BADGE: Record<AppRole, string> = {
  admin:           'bg-violet-950 text-violet-400 ring-violet-700',
  project_manager: 'bg-indigo-950 text-indigo-400 ring-indigo-700',
  auditor:         'bg-slate-800  text-slate-400  ring-slate-600',
  finance:         'bg-emerald-950 text-emerald-400 ring-emerald-700',
  subcontractor:   'bg-amber-950  text-amber-400  ring-amber-700',
}

// ── Role select ───────────────────────────────────────────────

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: AppRole
  onChange: (r: AppRole) => void
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AppRole)}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {GC_ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

// ── Feedback banner ───────────────────────────────────────────

function Banner({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
      type === 'success'
        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border border-red-200 bg-red-50 text-red-800'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertTriangle className="h-4 w-4 shrink-0" />
      }
      {message}
    </div>
  )
}

// ── Member row ────────────────────────────────────────────────

type Member = {
  id:          string
  fullName:    string
  companyName: string
  email:       string
  appRole:     AppRole | null
  joinedAt:    string
}

function MemberRow({
  member,
  isSelf,
}: {
  member: Member
  isSelf: boolean
}) {
  const [role, setRole]       = useState<AppRole>(member.appRole ?? 'project_manager')
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback]    = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const displayName = member.fullName || member.email.split('@')[0] || 'Unknown'

  function handleRoleChange(newRole: AppRole) {
    if (newRole === role) return
    setRole(newRole)
    setFeedback(null)

    startTransition(async () => {
      const result = await updateMemberRole(member.id, newRole)
      if (result.ok) {
        setFeedback({ type: 'success', msg: 'Role updated.' })
      } else {
        setRole(member.appRole ?? 'project_manager')
        setFeedback({ type: 'error', msg: result.error ?? 'Update failed.' })
      }
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
              {isSelf && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-medium text-slate-500">
                  You
                </span>
              )}
              <Badge className={`border-0 text-[10px] font-semibold ring-1 ${ROLE_BADGE[role] ?? ROLE_BADGE.auditor}`}>
                {GC_ROLES.find((r) => r.value === role)?.label ?? role}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500 truncate">{member.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Role select */}
        <div className="flex items-center gap-3 sm:shrink-0">
          {isSelf ? (
            <p className="text-xs text-slate-400 italic">Cannot change own role</p>
          ) : (
            <div className="w-44">
              <RoleSelect value={role} onChange={handleRoleChange} disabled={pending} />
            </div>
          )}
          {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
      </div>

      {feedback && (
        <div className="mt-3">
          <Banner type={feedback.type} message={feedback.msg} />
        </div>
      )}

      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
        <Clock className="h-3 w-3" />
        Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

// ── Invite form ───────────────────────────────────────────────

function InviteForm() {
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState<AppRole>('project_manager')
  const [pending,  startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function handleInvite() {
    if (!email.trim()) return
    setFeedback(null)

    startTransition(async () => {
      const result = await inviteTeamMember(email.trim(), role)
      if (result.ok) {
        setEmail('')
        setFeedback({ type: 'success', msg: `Invite sent to ${email.trim()}.` })
      } else {
        setFeedback({ type: 'error', msg: result.error ?? 'Invite failed.' })
      }
      setTimeout(() => setFeedback(null), 6000)
    })
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200">
          <UserPlus className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Invite Team Member</p>
          <p className="text-xs text-slate-500">They will receive an email to set up their account.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email Address</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Role</Label>
          <RoleSelect value={role} onChange={setRole} disabled={pending} />
        </div>

        <Button
          onClick={handleInvite}
          disabled={pending || !email.trim()}
          className="bg-slate-900 hover:bg-slate-700 text-white"
        >
          {pending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
          ) : (
            'Send Invite'
          )}
        </Button>
      </div>

      {feedback && (
        <div className="mt-4">
          <Banner type={feedback.type} message={feedback.msg} />
        </div>
      )}

      <div className="mt-4 space-y-1">
        {GC_ROLES.map((r) => (
          <p key={r.value} className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{r.label}:</span> {r.description}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────

export function TeamClient({
  members,
  currentUserId,
}: {
  members: Member[]
  currentUserId: string
}) {
  return (
    <div className="space-y-6">
      {/* Role guide */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div className="text-xs text-indigo-800 leading-relaxed">
          <strong>Role changes take effect immediately</strong> and are permanently logged to the Golden Thread.
          Admins can manage all features including the Finance Hub and Team settings.
        </div>
      </div>

      {/* Members */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            {members.length} Team Member{members.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <div className="space-y-3">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
          ))}
          {members.length === 0 && (
            <p className="text-sm text-slate-400 italic">No team members found.</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Invite */}
      <InviteForm />
    </div>
  )
}
