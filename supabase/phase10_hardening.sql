-- ============================================================
-- HardHat Compliance — Phase 10: Enterprise Hardening
-- Run AFTER phase9_rbac.sql.
-- ============================================================

-- ── 1. fn_log_audit_event — secure RPC wrapper ────────────────
-- Replaces the "audit_events_insert_service" blanket INSERT policy.
-- All app-layer audit writes must go through this function.
-- SECURITY DEFINER: executes as postgres, bypassing RLS.
-- auth.uid() is captured from the caller's JWT — NULL for service-role callers.

CREATE OR REPLACE FUNCTION public.fn_log_audit_event(
  p_subcontractor_id UUID    DEFAULT NULL,
  p_organization_id  UUID    DEFAULT NULL,
  p_event_type       TEXT    DEFAULT 'Audit',
  p_description      TEXT    DEFAULT '',
  p_actor            TEXT    DEFAULT 'System',
  p_metadata         JSONB   DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (
    subcontractor_id,
    organization_id,
    user_id,
    event_type,
    description,
    actor,
    metadata
  ) VALUES (
    p_subcontractor_id,
    p_organization_id,
    auth.uid(),
    p_event_type,
    p_description,
    p_actor,
    p_metadata
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_log_audit_event TO service_role;

-- ── 2. Remove the blanket INSERT policy on audit_events ───────
-- Any authenticated user could previously forge audit records.
-- All writes now go through fn_log_audit_event (above) or
-- existing SECURITY DEFINER trigger functions — both bypass RLS.

DROP POLICY IF EXISTS "audit_events_insert_service" ON public.audit_events;

-- ── 3. Auto payment release trigger ───────────────────────────
-- When a sub's compliance_status returns to 'compliant' and risk_score
-- drops below 31 while still on a Compliance Hold, automatically
-- flip payment_status to 'Clear to Pay' and log it to the Golden Thread.

CREATE OR REPLACE FUNCTION public.fn_auto_payment_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF  NEW.compliance_status = 'compliant'
  AND NEW.risk_score        < 31
  AND OLD.payment_status    = 'Compliance Hold'
  AND NEW.payment_status    = 'Compliance Hold'
  THEN
    NEW.payment_status := 'Clear to Pay';

    INSERT INTO public.audit_events (
      subcontractor_id,
      organization_id,
      event_type,
      description,
      actor,
      metadata
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      'Payment Update',
      'Payment hold automatically released — compliance restored. Risk score: '
        || NEW.risk_score || '/100.',
      'HardHat Auto-Release',
      jsonb_build_object(
        'old_status', 'Compliance Hold',
        'new_status', 'Clear to Pay',
        'risk_score', NEW.risk_score,
        'trigger',    'trg_auto_payment_release'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_payment_release ON public.subcontractors;
CREATE TRIGGER trg_auto_payment_release
  BEFORE UPDATE OF compliance_status, risk_score
  ON public.subcontractors
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_payment_release();

-- ── 4. Prequal review workflow columns ────────────────────────
-- Promotes prequal_submissions from an append-only receipt to a
-- reviewable record with a GC verdict.

ALTER TABLE public.prequal_submissions
  ADD COLUMN IF NOT EXISTS prequal_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (prequal_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewer_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS prequal_submissions_status_idx
  ON public.prequal_submissions (prequal_status, subcontractor_id);

-- ── 5. fn_review_prequal RPC ──────────────────────────────────
-- Called by admin/project_manager to approve or reject a prequal.
-- Validates caller role, updates the row, and logs to Golden Thread.

CREATE OR REPLACE FUNCTION public.fn_review_prequal(
  p_prequal_id UUID,
  p_verdict    TEXT,          -- 'approved' | 'rejected'
  p_notes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_actor       TEXT;
  v_sub_id      UUID;
  v_org_id      UUID;
BEGIN
  SELECT app_role::TEXT, COALESCE(full_name, 'GC User')
  INTO   v_caller_role, v_actor
  FROM   public.profiles
  WHERE  id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'project_manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to review prequal submissions.';
  END IF;

  IF p_verdict NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verdict: must be approved or rejected.';
  END IF;

  SELECT subcontractor_id, organization_id
  INTO   v_sub_id, v_org_id
  FROM   public.prequal_submissions
  WHERE  id = p_prequal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prequal submission not found.';
  END IF;

  UPDATE public.prequal_submissions
  SET    prequal_status = p_verdict,
         reviewer_id    = auth.uid(),
         reviewer_notes = p_notes,
         reviewed_at    = NOW()
  WHERE  id = p_prequal_id;

  INSERT INTO public.audit_events (
    subcontractor_id, organization_id, user_id,
    event_type, description, actor, metadata
  ) VALUES (
    v_sub_id, v_org_id, auth.uid(),
    'Audit',
    'Prequalification submission ' || p_verdict || '.'
      || CASE WHEN p_notes IS NOT NULL AND p_notes <> ''
              THEN ' Notes: ' || p_notes
              ELSE ''
         END,
    v_actor,
    jsonb_build_object(
      'verdict',    p_verdict,
      'prequal_id', p_prequal_id,
      'notes',      p_notes
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_review_prequal TO authenticated;

-- ── 6. Bootstrap first admin for new organizations ────────────
-- When an org is created, its owner is automatically promoted to admin.
-- This ensures every new tenant has at least one admin who can manage
-- the team without needing raw SQL access.

CREATE OR REPLACE FUNCTION public.fn_bootstrap_org_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET    app_role = 'admin'
  WHERE  id = NEW.owner_id
    AND  (app_role IS NULL OR app_role IN ('project_manager'::public.app_role, 'subcontractor'::public.app_role));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bootstrap_org_admin ON public.organizations;
CREATE TRIGGER trg_bootstrap_org_admin
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_bootstrap_org_admin();
