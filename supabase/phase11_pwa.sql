-- ============================================================
-- HardHat Compliance — Phase 11: Mobile Gate PWA & Site Monitor
-- ============================================================

-- ── 1. Push subscription storage ──────────────────────────────
-- Stores Web Push subscriptions for GC team members.
-- One row per user per device. Used to deliver critical-scan alerts.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  organization_id UUID        REFERENCES public.organizations(id)  ON DELETE CASCADE,
  endpoint        TEXT        NOT NULL,
  p256dh          TEXT        NOT NULL,
  auth            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Each user manages only their own subscriptions.
CREATE POLICY "push_subs_select_own"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_subs_insert_own"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_delete_own"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2. site_access_logs — SELECT policy for Realtime ─────────
-- The existing INSERT uses the service client (bypasses RLS).
-- This SELECT policy enables Supabase Realtime postgres_changes
-- for authenticated GC users on the Site Monitor dashboard.

DROP POLICY IF EXISTS "site_access_logs_select_gc" ON public.site_access_logs;
CREATE POLICY "site_access_logs_select_gc"
  ON public.site_access_logs FOR SELECT
  USING (organization_id = get_my_org_id());

-- Enable Realtime replication for the site_access_logs table.
-- Run this in the Supabase Dashboard → Database → Replication if not done:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.site_access_logs;
