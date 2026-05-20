-- ============================================================
-- HardHat Compliance — Phase 7: Safety (RAMS) AI Auditor
-- Run AFTER all prior migrations.
-- ============================================================

-- ── safety_documents ─────────────────────────────────────────
-- Stores RAMS, Safety Policies, and Training Records.
-- AI analysis results are persisted in JSONB and boolean fields.

CREATE TABLE IF NOT EXISTS public.safety_documents (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id          UUID        NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  organization_id           UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  doc_type                  TEXT        NOT NULL
    CHECK (doc_type IN ('RAMS', 'Safety Policy', 'Training Records')),
  doc_name                  TEXT        NOT NULL,
  approval_status           TEXT        NOT NULL DEFAULT 'Under Review'
    CHECK (approval_status IN ('Under Review', 'Approved', 'Rejected')),
  risk_level                TEXT
    CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  identified_hazards        JSONB       NOT NULL DEFAULT '[]',
  has_risk_matrix           BOOLEAN     NOT NULL DEFAULT false,
  has_emergency_procedures  BOOLEAN     NOT NULL DEFAULT false,
  high_risk_compliant       BOOLEAN,
  ai_feedback               TEXT,
  file_path                 TEXT,
  reviewed_by               TEXT,
  reviewed_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS safety_documents_sub_id_idx
  ON public.safety_documents(subcontractor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS safety_documents_org_id_idx
  ON public.safety_documents(organization_id);

-- Inherit org_id from the subcontractor on INSERT.
CREATE OR REPLACE FUNCTION public.fn_safety_docs_set_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.subcontractors WHERE id = NEW.subcontractor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_safety_docs_org_id ON public.safety_documents;
CREATE TRIGGER tr_safety_docs_org_id
  BEFORE INSERT ON public.safety_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_safety_docs_set_org_id();

-- Keep updated_at current.
DROP TRIGGER IF EXISTS tr_safety_docs_updated_at ON public.safety_documents;
CREATE TRIGGER tr_safety_docs_updated_at
  BEFORE UPDATE ON public.safety_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE public.safety_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safety_docs_select_gc"
  ON public.safety_documents FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "safety_docs_insert_service"
  ON public.safety_documents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "safety_docs_update_service"
  ON public.safety_documents FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ── Extend audit_events event_type ───────────────────────────
-- Adds 'Safety Audit' to the allowed values.

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_event_type_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_event_type_check CHECK (
    event_type IN (
      'Audit', 'Gate Scan', 'Manual Override', 'Nudge Sent',
      'Invite Sent', 'Portal Submission', 'Payment Update', 'Safety Audit'
    )
  );

-- ── Updated risk scoring (Phase 7 weighting: 40/40/20) ───────
-- Replaces the function from risk_scoring.sql.
--
-- expiry_pts       (max 40): soonest compliance_doc expiry
-- audit_flag_pts   (max 40): insurance flags (max 20) + safety rejected (max 20)
-- safety_record_pts(max 20): site incident (10) + missing Approved RAMS (10)

CREATE OR REPLACE FUNCTION public.calculate_subcontractor_risk_score(sub_id UUID)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiry_pts          SMALLINT := 0;
  insurance_flag_pts  SMALLINT := 0;
  safety_reject_pts   SMALLINT := 0;
  incident_pts        SMALLINT := 0;
  missing_rams_pts    SMALLINT := 0;
  min_days_away       INTEGER;
  flagged_insurance   INTEGER;
  rejected_safety     INTEGER;
  approved_rams       INTEGER;
  had_incident        BOOLEAN  := false;
BEGIN
  -- ── Expiry component (max 40 pts) ────────────────────────────
  SELECT MIN(expiry_date - CURRENT_DATE)
  INTO   min_days_away
  FROM   public.compliance_docs
  WHERE  subcontractor_id = sub_id
    AND  expiry_date IS NOT NULL;

  IF    min_days_away IS NULL  THEN expiry_pts := 0;
  ELSIF min_days_away < 0      THEN expiry_pts := 40;
  ELSIF min_days_away <= 14    THEN expiry_pts := 20;
  ELSE                              expiry_pts := 0;
  END IF;

  -- ── Insurance audit flags (max 20 pts) ───────────────────────
  SELECT COUNT(*) INTO flagged_insurance
  FROM   public.compliance_docs
  WHERE  subcontractor_id = sub_id AND audit_status = 'Flagged';

  IF flagged_insurance > 0 THEN insurance_flag_pts := 20; END IF;

  -- ── Safety rejection (max 20 pts) ────────────────────────────
  SELECT COUNT(*) INTO rejected_safety
  FROM   public.safety_documents
  WHERE  subcontractor_id = sub_id AND approval_status = 'Rejected';

  IF rejected_safety > 0 THEN safety_reject_pts := 20; END IF;

  -- ── Site incident (max 10 pts) ────────────────────────────────
  SELECT had_site_incident INTO had_incident
  FROM   public.prequal_submissions
  WHERE  subcontractor_id = sub_id
  ORDER  BY created_at DESC LIMIT 1;

  IF had_incident IS TRUE THEN incident_pts := 10; END IF;

  -- ── Missing Approved RAMS (max 10 pts) ────────────────────────
  SELECT COUNT(*) INTO approved_rams
  FROM   public.safety_documents
  WHERE  subcontractor_id = sub_id
    AND  doc_type = 'RAMS'
    AND  approval_status = 'Approved';

  IF approved_rams = 0 THEN missing_rams_pts := 10; END IF;

  RETURN LEAST(
    expiry_pts +
    LEAST(insurance_flag_pts + safety_reject_pts, 40) +
    LEAST(incident_pts + missing_rams_pts, 20),
    100
  )::SMALLINT;
END;
$$;

-- ── Trigger: safety_documents → sync risk_score ──────────────

CREATE OR REPLACE FUNCTION public.sync_risk_score_from_safety_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_sub UUID := COALESCE(NEW.subcontractor_id, OLD.subcontractor_id);
BEGIN
  UPDATE public.subcontractors
  SET    risk_score = public.calculate_subcontractor_risk_score(target_sub)
  WHERE  id = target_sub;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_safety_docs_risk ON public.safety_documents;
CREATE TRIGGER trg_safety_docs_risk
  AFTER INSERT OR UPDATE OR DELETE ON public.safety_documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_risk_score_from_safety_docs();

-- ── Trigger: safety_documents → Safety Audit event ───────────
-- Fires when approval_status transitions to Approved or Rejected.

CREATE OR REPLACE FUNCTION public.log_audit_event_from_safety_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_org UUID;
BEGIN
  IF NEW.approval_status NOT IN ('Approved', 'Rejected') THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.approval_status IS NOT DISTINCT FROM NEW.approval_status THEN
    RETURN NULL;
  END IF;

  SELECT organization_id INTO sub_org
  FROM   public.subcontractors WHERE id = NEW.subcontractor_id;

  INSERT INTO public.audit_events
    (subcontractor_id, organization_id, event_type, description, actor, metadata)
  VALUES (
    NEW.subcontractor_id,
    sub_org,
    'Safety Audit',
    CASE NEW.approval_status
      WHEN 'Approved' THEN
        'Safety document "' || NEW.doc_name || '" (' || NEW.doc_type || ') AI-Approved — safety compliance checks passed.'
      WHEN 'Rejected' THEN
        'Safety document "' || NEW.doc_name || '" (' || NEW.doc_type || ') Rejected — AI detected safety compliance issues.'
    END,
    'HardHat AI',
    jsonb_build_object(
      'doc_id',            NEW.id,
      'doc_type',          NEW.doc_type,
      'doc_name',          NEW.doc_name,
      'approval_status',   NEW.approval_status,
      'risk_level',        NEW.risk_level,
      'has_risk_matrix',   NEW.has_risk_matrix,
      'has_emergency_procedures', NEW.has_emergency_procedures,
      'high_risk_compliant', NEW.high_risk_compliant,
      'identified_hazards', NEW.identified_hazards
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_event_safety_docs ON public.safety_documents;
CREATE TRIGGER trg_audit_event_safety_docs
  AFTER INSERT OR UPDATE OF approval_status ON public.safety_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_from_safety_docs();

-- ── Backfill existing rows with updated scoring ───────────────
UPDATE public.subcontractors
SET    risk_score = public.calculate_subcontractor_risk_score(id);
