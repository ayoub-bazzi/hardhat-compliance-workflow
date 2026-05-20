-- ============================================================
-- HardHat Compliance — Finance & Payment Status Engine
-- Run AFTER golden_thread.sql (requires audit_events table)
-- ============================================================

-- ── Extend audit_events event_type to include Payment Update ──

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_event_type_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_event_type_check
  CHECK (event_type IN (
    'Audit', 'Gate Scan', 'Manual Override', 'Nudge Sent',
    'Invite Sent', 'Portal Submission', 'Payment Update'
  ));

-- ── payment_status enum & column ──────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'Clear to Pay', 'Compliance Hold', 'Manual Review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status
  NOT NULL DEFAULT 'Manual Review';

-- ── Core helper: compute + apply payment_status for one sub ───
-- Called by both triggers below.
-- Reads the CURRENT risk_score from the row to avoid stale data.

CREATE OR REPLACE FUNCTION public.sync_payment_status_for_sub(sub_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_score    SMALLINT;
  cur_status   public.payment_status;
  new_status   public.payment_status;
  sub_org      UUID;
  sub_name     TEXT;
  total_docs   INTEGER;
  pending_docs INTEGER;
BEGIN
  SELECT risk_score, payment_status, organization_id, company_name
  INTO   cur_score, cur_status, sub_org, sub_name
  FROM   public.subcontractors
  WHERE  id = sub_id;

  -- Risk ≥ 71 → hard stop
  IF cur_score >= 71 THEN
    new_status := 'Compliance Hold';

  -- Risk ≤ 30 → requires all docs Verified to clear
  ELSIF cur_score <= 30 THEN
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE audit_status != 'Verified')
    INTO   total_docs, pending_docs
    FROM   public.compliance_docs
    WHERE  subcontractor_id = sub_id;

    IF total_docs > 0 AND pending_docs = 0 THEN
      new_status := 'Clear to Pay';
    ELSE
      new_status := 'Manual Review';
    END IF;

  -- 31–70 → always manual review
  ELSE
    new_status := 'Manual Review';
  END IF;

  -- Exit early if no change (prevents duplicate Golden Thread entries)
  IF new_status IS NOT DISTINCT FROM cur_status THEN
    RETURN;
  END IF;

  UPDATE public.subcontractors
  SET    payment_status = new_status
  WHERE  id = sub_id;

  INSERT INTO public.audit_events
    (subcontractor_id, organization_id, event_type, description, actor, metadata)
  VALUES (
    sub_id, sub_org,
    'Payment Update',
    'Payment status updated: ' || cur_status::TEXT || ' → ' || new_status::TEXT || '.',
    'HardHat Finance Engine',
    jsonb_build_object(
      'old_status',  cur_status,
      'new_status',  new_status,
      'risk_score',  cur_score
    )
  );
END;
$$;

-- ── Trigger 1: subcontractors.risk_score → payment_status ─────

CREATE OR REPLACE FUNCTION public.sync_payment_from_risk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.risk_score IS DISTINCT FROM NEW.risk_score THEN
    PERFORM public.sync_payment_status_for_sub(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_from_risk ON public.subcontractors;
CREATE TRIGGER trg_payment_from_risk
  AFTER UPDATE OF risk_score ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_from_risk();

-- ── Trigger 2: compliance_docs.audit_status → payment_status ──
-- Needed for Verified→Pending transitions that don't change risk_score
-- but DO change Clear-to-Pay eligibility.

CREATE OR REPLACE FUNCTION public.sync_payment_from_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_sub UUID := COALESCE(NEW.subcontractor_id, OLD.subcontractor_id);
BEGIN
  PERFORM public.sync_payment_status_for_sub(target_sub);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_from_docs ON public.compliance_docs;
CREATE TRIGGER trg_payment_from_docs
  AFTER INSERT OR UPDATE OF audit_status OR DELETE ON public.compliance_docs
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_from_docs();

-- ── Backfill existing subcontractors ─────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.subcontractors LOOP
    PERFORM public.sync_payment_status_for_sub(r.id);
  END LOOP;
END;
$$;
