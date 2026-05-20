-- ============================================================
-- HardHat Compliance — Risk Scoring Engine
-- Run AFTER service_hubs.sql and phase3_invite.sql
-- ============================================================

-- ── Core scoring function ─────────────────────────────────────
-- Returns 0 (no risk) → 100 (critical).
-- Weighted: Expiry 40 pts | Audit Flags 40 pts | Safety 20 pts

CREATE OR REPLACE FUNCTION public.calculate_subcontractor_risk_score(sub_id UUID)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiry_pts    SMALLINT := 0;
  flag_pts      SMALLINT := 0;
  safety_pts    SMALLINT := 0;
  min_days_away INTEGER;
  flagged_count INTEGER;
  had_incident  BOOLEAN  := false;
BEGIN
  -- ── Expiry component (max 40 pts) ────────────────────────────
  -- Uses the soonest expiry_date across all compliance_docs for this sub.
  SELECT MIN(expiry_date - CURRENT_DATE)
  INTO   min_days_away
  FROM   public.compliance_docs
  WHERE  subcontractor_id = sub_id
    AND  expiry_date IS NOT NULL;

  IF    min_days_away IS NULL   THEN expiry_pts := 0;   -- no dated docs
  ELSIF min_days_away < 0       THEN expiry_pts := 40;  -- at least one doc expired
  ELSIF min_days_away <= 14     THEN expiry_pts := 20;  -- expiring within 14 days
  ELSE                               expiry_pts := 0;   -- > 14 days (incl. 14–30 gap)
  END IF;

  -- ── Audit flags component (max 40 pts) ───────────────────────
  SELECT COUNT(*)
  INTO   flagged_count
  FROM   public.compliance_docs
  WHERE  subcontractor_id = sub_id
    AND  audit_status = 'Flagged';

  IF    flagged_count = 0 THEN flag_pts := 0;
  ELSIF flagged_count = 1 THEN flag_pts := 20;
  ELSE                        flag_pts := 40;
  END IF;

  -- ── Safety component (max 20 pts) ───────────────────────────
  -- Pulls most-recent prequal submission for this sub.
  SELECT had_site_incident
  INTO   had_incident
  FROM   public.prequal_submissions
  WHERE  subcontractor_id = sub_id
  ORDER  BY created_at DESC
  LIMIT  1;

  IF had_incident IS TRUE THEN safety_pts := 20; END IF;

  RETURN LEAST(expiry_pts + flag_pts + safety_pts, 100)::SMALLINT;
END;
$$;

-- ── Trigger function: compliance_docs → sync risk_score ───────

CREATE OR REPLACE FUNCTION public.sync_risk_score_from_docs()
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

DROP TRIGGER IF EXISTS trg_compliance_docs_risk ON public.compliance_docs;
CREATE TRIGGER trg_compliance_docs_risk
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_docs
  FOR EACH ROW EXECUTE FUNCTION public.sync_risk_score_from_docs();

-- ── Trigger function: prequal_submissions → sync risk_score ───

CREATE OR REPLACE FUNCTION public.sync_risk_score_from_prequal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subcontractors
  SET    risk_score = public.calculate_subcontractor_risk_score(NEW.subcontractor_id)
  WHERE  id = NEW.subcontractor_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prequal_risk ON public.prequal_submissions;
CREATE TRIGGER trg_prequal_risk
  AFTER INSERT OR UPDATE ON public.prequal_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_risk_score_from_prequal();

-- ── Backfill existing rows ────────────────────────────────────
-- Run once to score all subs that existed before the engine was added.
UPDATE public.subcontractors
SET    risk_score = public.calculate_subcontractor_risk_score(id);
