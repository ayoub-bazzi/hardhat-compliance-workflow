-- Phase 15: Worker Attendance Analytics & Safety Induction Tracker
-- Run in Supabase SQL Editor

-- ── 1. Add induction columns to subcontractors ─────────────────
ALTER TABLE subcontractors
  ADD COLUMN IF NOT EXISTS safety_induction_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS induction_date            date;

-- ── 2. Attendance daily summary view ──────────────────────────
-- Aggregates GRANTED scans per day per org for the punch-card chart.
CREATE OR REPLACE VIEW attendance_daily_summary AS
SELECT
  organization_id,
  subcontractor_id,
  date_trunc('day', created_at)::date AS scan_date,
  COUNT(*) FILTER (WHERE result = 'GRANTED') AS granted_count,
  COUNT(*) FILTER (WHERE result = 'DENIED')  AS denied_count,
  MIN(created_at) FILTER (WHERE result = 'GRANTED') AS first_entry,
  MAX(created_at) FILTER (WHERE result = 'GRANTED') AS last_entry
FROM site_access_logs
GROUP BY organization_id, subcontractor_id, date_trunc('day', created_at)::date;

-- ── 3. Last seen workers view ──────────────────────────────────
-- Latest GRANTED scan per subcontractor, used for the "Last Seen" dashboard card.
CREATE OR REPLACE VIEW last_seen_workers AS
SELECT DISTINCT ON (sal.subcontractor_id)
  sal.id          AS log_id,
  sal.subcontractor_id,
  sal.organization_id,
  sal.created_at  AS last_seen_at,
  s.company_name,
  s.profile_photo_url
FROM site_access_logs sal
JOIN subcontractors s ON s.id = sal.subcontractor_id
WHERE sal.result = 'GRANTED'
ORDER BY sal.subcontractor_id, sal.created_at DESC;

-- ── 4. RLS for views inherits from base tables (no additional policies needed)
-- The views reference site_access_logs and subcontractors which already have RLS.
-- Use security_invoker to inherit the caller's RLS context.
ALTER VIEW attendance_daily_summary SET (security_invoker = on);
ALTER VIEW last_seen_workers        SET (security_invoker = on);
