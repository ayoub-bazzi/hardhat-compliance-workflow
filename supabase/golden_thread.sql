-- ============================================================
-- HardHat Compliance — Golden Thread Audit Ledger
-- Run AFTER service_hubs.sql and phase3_invite.sql
-- ============================================================

-- ── audit_events table ────────────────────────────────────────
-- Immutable append-only ledger. No UPDATE/DELETE policies.

CREATE TABLE IF NOT EXISTS public.audit_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID        NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  organization_id  UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type       TEXT        NOT NULL CHECK (
    event_type IN ('Audit', 'Gate Scan', 'Manual Override', 'Nudge Sent', 'Invite Sent', 'Portal Submission')
  ),
  description      TEXT        NOT NULL,
  actor            TEXT        NOT NULL DEFAULT 'HardHat AI',
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_sub_id_idx ON public.audit_events(subcontractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_org_id_idx ON public.audit_events(organization_id, created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- GC sees events for their org only
CREATE POLICY "audit_events_select"
  ON public.audit_events FOR SELECT
  USING (organization_id = get_my_org_id());

-- Only service role / triggers may insert (no client INSERT)
CREATE POLICY "audit_events_insert_service"
  ON public.audit_events FOR INSERT
  WITH CHECK (true);

-- ── Trigger 1: compliance_docs → Audit event ─────────────────
-- Fires when audit_status is set to Verified or Flagged.

CREATE OR REPLACE FUNCTION public.log_audit_event_from_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_org UUID;
BEGIN
  IF NEW.audit_status NOT IN ('Verified', 'Flagged') THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.audit_status IS NOT DISTINCT FROM NEW.audit_status THEN
    RETURN NULL;
  END IF;

  SELECT organization_id INTO sub_org
  FROM   public.subcontractors WHERE id = NEW.subcontractor_id;

  INSERT INTO public.audit_events
    (subcontractor_id, organization_id, event_type, description, actor, metadata)
  VALUES (
    NEW.subcontractor_id,
    sub_org,
    'Audit',
    CASE NEW.audit_status
      WHEN 'Verified' THEN 'Document "' || NEW.doc_name || '" AI-Verified — all compliance checks passed.'
      WHEN 'Flagged'  THEN 'Document "' || NEW.doc_name || '" Flagged — AI detected one or more compliance issues.'
    END,
    'HardHat AI',
    jsonb_build_object(
      'doc_id',       NEW.id,
      'doc_type',     NEW.doc_type,
      'doc_name',     NEW.doc_name,
      'audit_status', NEW.audit_status,
      'expiry_date',  NEW.expiry_date,
      'notes',        NEW.notes
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_event_docs ON public.compliance_docs;
CREATE TRIGGER trg_audit_event_docs
  AFTER INSERT OR UPDATE OF audit_status ON public.compliance_docs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_from_docs();

-- ── Trigger 2: site_access_logs → Gate Scan event ────────────

CREATE OR REPLACE FUNCTION public.log_audit_event_from_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events
    (subcontractor_id, organization_id, event_type, description, actor, metadata)
  VALUES (
    NEW.subcontractor_id,
    NEW.organization_id,
    'Gate Scan',
    'Site access ' || NEW.result ||
      COALESCE(' at ' || NEW.gate_location, '') || '.',
    'Gate System',
    jsonb_build_object(
      'result',          NEW.result,
      'gate_location',   NEW.gate_location,
      'denial_reasons',  NEW.denial_reasons
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_event_gate ON public.site_access_logs;
CREATE TRIGGER trg_audit_event_gate
  AFTER INSERT ON public.site_access_logs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_from_gate();

-- ── Trigger 3: subcontractors → Invite Sent / Portal Submission

CREATE OR REPLACE FUNCTION public.log_audit_event_from_sub_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Invite sent: invite_token was just set or rotated
  IF OLD.invite_token IS DISTINCT FROM NEW.invite_token AND NEW.invite_token IS NOT NULL THEN
    INSERT INTO public.audit_events
      (subcontractor_id, organization_id, event_type, description, actor, metadata)
    VALUES (
      NEW.id, NEW.organization_id,
      'Invite Sent',
      'Compliance portal invitation dispatched to ' || NEW.contact_email || '.',
      'GC System',
      jsonb_build_object('email', NEW.contact_email, 'expires_at', NEW.invite_expires_at)
    );
  END IF;

  -- Portal accepted: portal_submitted_at transitioned from NULL → timestamp
  IF OLD.portal_submitted_at IS NULL AND NEW.portal_submitted_at IS NOT NULL THEN
    INSERT INTO public.audit_events
      (subcontractor_id, organization_id, event_type, description, actor, metadata)
    VALUES (
      NEW.id, NEW.organization_id,
      'Portal Submission',
      NEW.company_name || ' completed the compliance portal and submitted all required documents.',
      NEW.company_name,
      jsonb_build_object('submitted_at', NEW.portal_submitted_at)
    );
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_event_sub ON public.subcontractors;
CREATE TRIGGER trg_audit_event_sub
  AFTER UPDATE OF invite_token, portal_submitted_at ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_from_sub_update();
