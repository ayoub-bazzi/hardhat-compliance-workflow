-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 4: Nudge Engine — nudge_logs table + escalation function
-- Run AFTER golden_thread.sql (requires audit_events)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Type: NudgeAlertType ──────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nudge_alert_type') THEN
    CREATE TYPE nudge_alert_type AS ENUM ('flagged', 'expiry_7d', 'expiry_48h', 'hard_stop');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nudge_channel') THEN
    CREATE TYPE nudge_channel AS ENUM ('email', 'sms', 'whatsapp');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nudge_status') THEN
    CREATE TYPE nudge_status AS ENUM ('sent', 'failed', 'skipped');
  END IF;
END $$;

-- ── 2. Table: nudge_logs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nudge_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id  uuid        NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  organization_id   uuid,
  alert_type        nudge_alert_type NOT NULL,
  channel           nudge_channel    NOT NULL,
  recipient         text        NOT NULL,
  status            nudge_status     NOT NULL DEFAULT 'sent',
  metadata          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nudge_logs_subcontractor ON nudge_logs (subcontractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nudge_logs_org ON nudge_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nudge_logs_alert_type ON nudge_logs (alert_type, created_at DESC);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE nudge_logs ENABLE ROW LEVEL SECURITY;

-- GCs see only their org's nudge logs (read-only; writes go via service role)
CREATE POLICY "gc_read_nudge_logs" ON nudge_logs
  FOR SELECT
  USING (organization_id = get_my_org_id());

-- Service role bypasses RLS so API routes can insert freely.

-- ── 4. Escalation function ───────────────────────────────────────────────────
-- Called by the hard-stop-check CRON route after it sends a hard_stop nudge.
-- Creates a high-priority gc_notification if the sub has been at risk ≥ 71
-- for more than 48 hours and no escalation notification was sent today.

CREATE OR REPLACE FUNCTION create_hard_stop_escalation(
  p_subcontractor_id uuid,
  p_organization_id  uuid,
  p_company_name     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_hard_stop timestamptz;
  v_existing_notif  uuid;
BEGIN
  -- Find the earliest hard_stop nudge for this sub
  SELECT created_at INTO v_first_hard_stop
  FROM nudge_logs
  WHERE subcontractor_id = p_subcontractor_id
    AND alert_type = 'hard_stop'
  ORDER BY created_at ASC
  LIMIT 1;

  -- No hard_stop nudge ever sent → nothing to escalate yet
  IF v_first_hard_stop IS NULL THEN
    RETURN;
  END IF;

  -- Not yet 48 hours → too soon to escalate
  IF now() - v_first_hard_stop < INTERVAL '48 hours' THEN
    RETURN;
  END IF;

  -- Check if an escalation gc_notification already exists in last 24 h
  SELECT id INTO v_existing_notif
  FROM gc_notifications
  WHERE subcontractor_id = p_subcontractor_id
    AND message LIKE '%ESCALATION%'
    AND created_at > now() - INTERVAL '24 hours'
  LIMIT 1;

  IF v_existing_notif IS NOT NULL THEN
    RETURN;
  END IF;

  -- Create the escalation notification for the Project Manager
  INSERT INTO gc_notifications (organization_id, subcontractor_id, message)
  VALUES (
    p_organization_id,
    p_subcontractor_id,
    'ESCALATION — ' || p_company_name || ' has maintained a Critical Risk score (≥ 71) for over 48 hours. Immediate PM review required.'
  );
END;
$$;
