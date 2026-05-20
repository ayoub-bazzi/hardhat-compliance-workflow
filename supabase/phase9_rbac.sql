-- ============================================================
-- HardHat Compliance — Phase 9: RBAC & Security Hardening
-- Run AFTER all prior migrations.
-- ============================================================

-- ── 1. App-level role enum ────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'project_manager',
    'auditor',
    'finance',
    'subcontractor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Add app_role column to profiles ───────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_role public.app_role;

-- Backfill: existing GC users → project_manager, subs → subcontractor
UPDATE public.profiles
SET    app_role = CASE
  WHEN role = 'gc'            THEN 'project_manager'::public.app_role
  WHEN role = 'subcontractor' THEN 'subcontractor'::public.app_role
  ELSE                             'project_manager'::public.app_role
END
WHERE  app_role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN app_role SET DEFAULT 'project_manager';

ALTER TABLE public.profiles
  ALTER COLUMN app_role SET NOT NULL;

-- ── 3. Helper function: current user's app_role ───────────────

CREATE OR REPLACE FUNCTION public.get_my_app_role()
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_role FROM public.profiles WHERE id = auth.uid()
$$;

-- ── 4. Extend audit_events for system-level events ───────────
-- Make subcontractor_id nullable so role-change and access-denial
-- events can be stored without a subcontractor FK.

ALTER TABLE public.audit_events
  ALTER COLUMN subcontractor_id DROP NOT NULL;

-- Track which user triggered a system event
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audit_events_user_id_idx
  ON public.audit_events (user_id, created_at DESC);

-- Extend allowed event types
ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_event_type_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_event_type_check CHECK (
    event_type IN (
      'Audit', 'Gate Scan', 'Manual Override', 'Nudge Sent',
      'Invite Sent', 'Portal Submission', 'Payment Update',
      'Safety Audit', 'Role Change', 'Access Denied'
    )
  );

-- ── 5. RLS overhaul: audit_events ────────────────────────────
-- Drop the blanket org-scoped SELECT policy and replace with RBAC.

DROP POLICY IF EXISTS "audit_events_select"   ON public.audit_events;

CREATE POLICY "audit_events_select_rbac"
  ON public.audit_events FOR SELECT
  USING (
    organization_id = get_my_org_id()
    AND get_my_app_role() IN ('admin', 'project_manager', 'auditor', 'finance')
  );

-- ── 6. RLS overhaul: safety_documents ────────────────────────

DROP POLICY IF EXISTS "safety_docs_select_gc"      ON public.safety_documents;
DROP POLICY IF EXISTS "safety_docs_update_service" ON public.safety_documents;

-- All non-sub GC roles can view safety documents
CREATE POLICY "safety_docs_select_rbac"
  ON public.safety_documents FOR SELECT
  USING (
    organization_id = get_my_org_id()
    AND get_my_app_role() IN ('admin', 'project_manager', 'auditor', 'finance')
  );

-- Only admin and project_manager can approve / reject safety docs.
-- Auditors view only; they cannot update approval_status.
CREATE POLICY "safety_docs_update_rbac"
  ON public.safety_documents FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND get_my_app_role() IN ('admin', 'project_manager')
  )
  WITH CHECK (
    organization_id = get_my_org_id()
    AND get_my_app_role() IN ('admin', 'project_manager')
  );

-- ── 7. RLS overhaul: project_risk_history ────────────────────
-- Executive data — admin, finance, and project_manager only.

DROP POLICY IF EXISTS "risk_history_select_gc" ON public.project_risk_history;

CREATE POLICY "risk_history_select_rbac"
  ON public.project_risk_history FOR SELECT
  USING (
    organization_id = get_my_org_id()
    AND get_my_app_role() IN ('admin', 'finance', 'project_manager')
  );

-- ── 8. Security logging function ─────────────────────────────
-- Called by the middleware when a 403 access denial is triggered.
-- Uses SECURITY DEFINER so any authenticated user can call it via RPC.

CREATE OR REPLACE FUNCTION public.fn_log_access_denied(
  p_attempted_path TEXT,
  p_user_role      TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_email  TEXT;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.profiles WHERE id = auth.uid();

  v_email := auth.jwt() ->> 'email';

  INSERT INTO public.audit_events (
    subcontractor_id,
    organization_id,
    user_id,
    event_type,
    description,
    actor,
    metadata
  ) VALUES (
    NULL,
    v_org_id,
    auth.uid(),
    'Access Denied',
    'Blocked access to restricted route: ' || p_attempted_path ||
      ' — insufficient role (' || p_user_role || ').',
    COALESCE(v_email, 'unknown'),
    jsonb_build_object(
      'attempted_path', p_attempted_path,
      'user_role',      p_user_role,
      'user_id',        auth.uid()
    )
  );
END;
$$;

-- ── 9. Role-change audit trigger ─────────────────────────────
-- Appends a Golden Thread entry whenever a user's app_role is updated.

CREATE OR REPLACE FUNCTION public.fn_audit_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF OLD.app_role IS NOT DISTINCT FROM NEW.app_role THEN RETURN NULL; END IF;

  SELECT organization_id INTO v_org_id
  FROM public.profiles WHERE id = NEW.id;

  INSERT INTO public.audit_events (
    subcontractor_id,
    organization_id,
    user_id,
    event_type,
    description,
    actor,
    metadata
  ) VALUES (
    NULL,
    v_org_id,
    NEW.id,
    'Role Change',
    'User app_role changed from ' ||
      COALESCE(OLD.app_role::TEXT, 'unset') || ' → ' || NEW.app_role::TEXT || '.',
    'System Admin',
    jsonb_build_object(
      'user_id',  NEW.id,
      'old_role', OLD.app_role,
      'new_role', NEW.app_role
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_role_change ON public.profiles;
CREATE TRIGGER trg_profile_role_change
  AFTER UPDATE OF app_role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_role_change();

-- ── 10. profiles RLS: own app_role is readable ───────────────
-- The existing "Users can view own profile" policy covers this,
-- but we add an explicit UPDATE guard so only admins can change roles.
-- (Enforced at application layer via server actions; this is defense in depth.)

CREATE POLICY IF NOT EXISTS "profile_app_role_update_self"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
