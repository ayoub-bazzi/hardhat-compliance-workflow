-- ============================================================
-- HardHat Compliance — Phase 8: Project Insights & Reporting
-- Run AFTER all prior migrations (phase7_safety.sql required).
-- ============================================================

-- ── project_risk_analytics VIEW ──────────────────────────────
-- Read-only aggregation of subcontractor risk data per project.
-- Inherits RLS from the underlying projects + subcontractors tables.

CREATE OR REPLACE VIEW public.project_risk_analytics AS
SELECT
  p.id                                                                        AS project_id,
  p.name                                                                      AS project_name,
  p.organization_id,
  COUNT(s.id)::INT                                                            AS total_subs,
  COALESCE(ROUND(AVG(s.risk_score::NUMERIC)), 0)::SMALLINT                  AS avg_risk_score,
  COALESCE(ROUND(
    100.0 * COUNT(s.id) FILTER (WHERE s.compliance_status = 'compliant')
    / NULLIF(COUNT(s.id), 0)
  ), 0)::INT                                                                  AS site_ready_pct,
  COALESCE(ROUND(
    100.0 * COUNT(s.id) FILTER (WHERE s.payment_status = 'Compliance Hold')
    / NULLIF(COUNT(s.id), 0)
  ), 0)::INT                                                                  AS payment_blocked_pct,
  COUNT(s.id) FILTER (WHERE s.risk_score >= 71)::INT                         AS critical_count,
  COUNT(s.id) FILTER (WHERE s.risk_score >= 31 AND s.risk_score < 71)::INT   AS elevated_count
FROM public.projects p
LEFT JOIN public.subcontractors s ON s.project_id = p.id
GROUP BY p.id, p.name, p.organization_id;

-- ── project_risk_history TABLE ────────────────────────────────
-- Weekly snapshot of project-level risk analytics.
-- One row per project per snapshot date (unique constraint enforces idempotency).

CREATE TABLE IF NOT EXISTS public.project_risk_history (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id     UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  snapshot_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  avg_risk_score      SMALLINT    NOT NULL DEFAULT 0,
  total_subs          INT         NOT NULL DEFAULT 0,
  site_ready_pct      INT         NOT NULL DEFAULT 0,
  payment_blocked_pct INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS project_risk_history_project_date_idx
  ON public.project_risk_history (project_id, snapshot_date DESC);

ALTER TABLE public.project_risk_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_history_select_gc"
  ON public.project_risk_history FOR SELECT
  USING (organization_id = get_my_org_id());

-- Service role can insert (cron route uses service client).
CREATE POLICY "risk_history_insert_service"
  ON public.project_risk_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "risk_history_update_service"
  ON public.project_risk_history FOR UPDATE
  USING (true) WITH CHECK (true);

-- ── fn_take_risk_snapshot FUNCTION ───────────────────────────
-- Upserts today's risk snapshot for every active project.
-- Call every Monday via the /api/cron/risk-snapshot endpoint.

CREATE OR REPLACE FUNCTION public.fn_take_risk_snapshot()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_risk_history
    (project_id, organization_id, snapshot_date, avg_risk_score, total_subs, site_ready_pct, payment_blocked_pct)
  SELECT
    project_id,
    organization_id,
    CURRENT_DATE,
    avg_risk_score,
    total_subs,
    site_ready_pct,
    payment_blocked_pct
  FROM public.project_risk_analytics
  ON CONFLICT (project_id, snapshot_date)
  DO UPDATE SET
    avg_risk_score      = EXCLUDED.avg_risk_score,
    total_subs          = EXCLUDED.total_subs,
    site_ready_pct      = EXCLUDED.site_ready_pct,
    payment_blocked_pct = EXCLUDED.payment_blocked_pct;
END;
$$;

-- ── Seed first snapshot immediately ──────────────────────────
-- Run once so the trend chart has an initial data point.
SELECT public.fn_take_risk_snapshot();
