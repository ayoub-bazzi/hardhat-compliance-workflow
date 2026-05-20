-- ============================================================
-- HardHat Compliance — Phase 3: Invitation & Portal
-- Run AFTER service_hubs.sql
-- ============================================================

-- ── Invite columns on subcontractors ─────────────────────────

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS invite_token         TEXT   UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_submitted_at  TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subcontractors_invite_token
  ON public.subcontractors(invite_token)
  WHERE invite_token IS NOT NULL;

-- ── prequal_submissions ───────────────────────────────────────
-- Stores the Safety & Financials form submitted via the magic-link portal.

CREATE TABLE IF NOT EXISTS public.prequal_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id     UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  organization_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  had_site_incident    BOOLEAN NOT NULL DEFAULT false,
  bonding_capacity     TEXT,
  trade_accreditation  TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prequal_submissions_sub_id
  ON public.prequal_submissions(subcontractor_id);

ALTER TABLE public.prequal_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prequal_select"
  ON public.prequal_submissions FOR SELECT
  USING (organization_id = get_my_org_id());

-- Service role inserts from the public portal (no user session).
-- RLS is bypassed for INSERT via service key; anon cannot insert.
CREATE POLICY "prequal_insert"
  ON public.prequal_submissions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── gc_notifications ──────────────────────────────────────────
-- Real-time feed for the GC Command Center ("Sub X submitted docs").

CREATE TABLE IF NOT EXISTS public.gc_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  message          TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_notifications_org_unread
  ON public.gc_notifications(organization_id, is_read, created_at DESC);

ALTER TABLE public.gc_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gc_notifications_select"
  ON public.gc_notifications FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "gc_notifications_update"
  ON public.gc_notifications FOR UPDATE
  USING (organization_id = get_my_org_id());

-- Service role inserts from the portal.
CREATE POLICY "gc_notifications_insert"
  ON public.gc_notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
