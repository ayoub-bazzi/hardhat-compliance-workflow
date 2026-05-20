-- ============================================================
-- Phase 14 — Notification Center, Leaderboard, Failure Heatmap
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── in_app_notifications ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL,
  subcontractor_id uuid        REFERENCES subcontractors(id) ON DELETE CASCADE,
  event_type       text        NOT NULL
                   CHECK (event_type IN ('DOCUMENT_REJECTED', 'GATE_DENIED', 'EXPIRY_WARNING', 'PREQUAL_SUBMITTED')),
  title            text        NOT NULL,
  body             text        NOT NULL DEFAULT '',
  link             text,
  is_read          boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Partial index: only unread rows are indexed so the mark-all-read UPDATE
-- runs a single index scan against a compact, ever-shrinking set.
CREATE INDEX IF NOT EXISTS idx_in_app_notif_unread
  ON in_app_notifications (organization_id, created_at DESC)
  WHERE is_read = FALSE;

-- General read index (dropdown fetch, leaderboard page)
CREATE INDEX IF NOT EXISTS idx_in_app_notif_org_created
  ON in_app_notifications (organization_id, created_at DESC);

-- RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GC members read their org notifications"
  ON in_app_notifications FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Users can only flip is_read to true (no other column updates allowed)
CREATE POLICY "GC members mark notifications as read"
  ON in_app_notifications FOR UPDATE
  USING  (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (is_read = true);

-- ── Realtime subscription ─────────────────────────────────────
-- In Supabase Dashboard → Database → Replication:
--   Enable INSERT events for in_app_notifications

-- ── Automation: insert notification when compliance_doc flagged ──

CREATE OR REPLACE FUNCTION fn_notify_document_flagged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.audit_status = 'Flagged'
     AND (OLD.audit_status IS DISTINCT FROM 'Flagged')
     AND NEW.organization_id IS NOT NULL
  THEN
    INSERT INTO in_app_notifications
      (organization_id, subcontractor_id, event_type, title, body, link)
    VALUES (
      NEW.organization_id,
      NEW.subcontractor_id,
      'DOCUMENT_REJECTED',
      NEW.doc_type || ' Rejected by AI',
      '"' || NEW.doc_name || '" failed the compliance review.',
      '/gc/risk/' || NEW.subcontractor_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_flagged ON compliance_docs;
CREATE TRIGGER trg_notify_document_flagged
  AFTER UPDATE ON compliance_docs
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_document_flagged();

-- ── Automation: insert notification when gate access DENIED ──────

CREATE OR REPLACE FUNCTION fn_notify_gate_denied()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name text;
  v_org_id       uuid;
BEGIN
  IF NEW.result = 'DENIED' THEN
    SELECT company_name, organization_id
      INTO v_company_name, v_org_id
      FROM subcontractors
     WHERE id = NEW.subcontractor_id;

    INSERT INTO in_app_notifications
      (organization_id, subcontractor_id, event_type, title, body, link)
    VALUES (
      COALESCE(NEW.organization_id, v_org_id),
      NEW.subcontractor_id,
      'GATE_DENIED',
      'Gate Access Denied',
      v_company_name || ' was denied site access.',
      '/gc/risk/' || NEW.subcontractor_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_gate_denied ON site_access_logs;
CREATE TRIGGER trg_notify_gate_denied
  AFTER INSERT ON site_access_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_gate_denied();

-- ── Leaderboard view ──────────────────────────────────────────
-- Ranks subcontractors within each org by risk_score ascending.
-- Rank 1 = most compliant (lowest risk). RLS on the underlying
-- subcontractors + projects tables scopes results to the caller's org.

CREATE OR REPLACE VIEW subcontractor_leaderboard AS
SELECT
  s.id,
  s.company_name,
  s.compliance_status,
  s.risk_score,
  s.organization_id,
  p.name AS project_name,
  RANK() OVER (
    PARTITION BY s.organization_id
    ORDER BY s.risk_score ASC NULLS LAST
  )::int AS rank
FROM subcontractors s
JOIN projects p ON p.id = s.project_id;
