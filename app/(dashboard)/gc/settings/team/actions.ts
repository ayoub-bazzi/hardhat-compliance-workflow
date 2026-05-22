'use server'

import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { AppRole } from '@/types/database.types'

const GC_APP_ROLES: AppRole[] = ['admin', 'project_manager', 'auditor', 'finance']

export type TeamActionResult = { ok: boolean; error?: string }

// ── Update an existing member's app_role ──────────────────────

export async function updateMemberRole(
  targetUserId: string,
  newRole: AppRole,
): Promise<TeamActionResult> {
  if (!GC_APP_ROLES.includes(newRole)) {
    return { ok: false, error: 'Invalid role.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  if (targetUserId === user.id) {
    return { ok: false, error: 'You cannot change your own role.' }
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('app_role, organization_id')
    .eq('id', user.id)
    .single()

  if (callerProfile?.app_role !== 'admin') {
    return { ok: false, error: 'Only admins can change team roles.' }
  }

  // Verify target user belongs to the same org.
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('organization_id, app_role')
    .eq('id', targetUserId)
    .single()

  if (!targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
    return { ok: false, error: 'User not found in your organization.' }
  }

  // The fn_audit_role_change trigger fires automatically on UPDATE.
  const { error } = await supabase
    .from('profiles')
    .update({ app_role: newRole })
    .eq('id', targetUserId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/gc/settings/team')
  return { ok: true }
}

// ── Invite a new GC team member ───────────────────────────────
// Uses the service-role client to call Supabase Auth Admin API,
// which sends the official invite email and creates the auth user.
// We pre-create their profile row so they land in the right org
// with the right role on first login.

export async function inviteTeamMember(
  email: string,
  intendedRole: AppRole,
): Promise<TeamActionResult> {
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'A valid email address is required.' }
  }
  if (!GC_APP_ROLES.includes(intendedRole)) {
    return { ok: false, error: 'Invalid role.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('app_role, organization_id')
    .eq('id', user.id)
    .single()

  if (callerProfile?.app_role !== 'admin') {
    return { ok: false, error: 'Only admins can invite team members.' }
  }
  if (!callerProfile.organization_id) {
    return { ok: false, error: 'Your account is not linked to an organization.' }
  }

  const service = createServiceSupabaseClient()

  // inviteUserByEmail creates the auth user and sends the invite email.
  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/gc/projects` },
  )

  if (inviteError || !invited.user) {
    return { ok: false, error: inviteError?.message ?? 'Invite failed.' }
  }

  // Pre-create the profile so their org + role are set before first login.
  // upsert handles the edge case where Supabase already created a stub profile.
  const { error: profileError } = await service
    .from('profiles')
    .upsert(
      {
        id:              invited.user.id,
        role:            'gc',
        app_role:        intendedRole,
        organization_id: callerProfile.organization_id,
      },
      { onConflict: 'id', ignoreDuplicates: false },
    )

  if (profileError) {
    return { ok: false, error: `Profile setup failed: ${profileError.message}` }
  }

  // Log the invitation to the Golden Thread.
  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: null,
    p_organization_id:  callerProfile.organization_id,
    p_event_type:       'Audit',
    p_description:      `Team invite sent to ${email} with role: ${intendedRole}.`,
    p_actor:            user.email ?? 'Admin',
    p_metadata: {
      invited_email: email,
      intended_role: intendedRole,
      invited_user_id: invited.user.id,
    },
  })

  revalidatePath('/gc/settings/team')
  return { ok: true }
}
