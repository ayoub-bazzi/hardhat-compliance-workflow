-- ============================================================
-- Phase 13 — Compliance Concierge: Watchdog & Notification Logs
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── notification_logs ─────────────────────────────────────────
-- Dedicated log for the compliance watchdog. Separate from nudge_logs
-- (which serves the legacy expiry-nudge and flagged-alert routes) so
-- the watchdog's 72-hour cooldown logic has a clean, isolated source.

CREATE TABLE IF NOT EXISTS notification_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid        NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  organization_id  uuid,
  type             text        NOT NULL CHECK (type IN ('EXPIRY_WARNING', 'AUDIT_REJECTION', 'ACCESS_REVOKED')),
  channel          text        NOT NULL CHECK (channel IN ('EMAIL', 'SMS')),
  recipient        text        NOT NULL,
  status           text        NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  metadata         jsonb       NOT NULL DEFAULT '{}',
  sent_at          timestamptz NOT NULL DEFAULT now()
);

-- Cooldown index: fast lookup of (sub, type) within a time window
CREATE INDEX IF NOT EXISTS notification_logs_sub_type_sent
  ON notification_logs (subcontractor_id, type, sent_at DESC);

-- RLS: service role writes only (watchdog uses service client)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GC can read their org notification logs"
  ON notification_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
