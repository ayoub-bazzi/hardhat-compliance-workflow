-- Phase 17: AI Daily Site Journal
-- Run in Supabase SQL Editor

-- ── 1. site_journals table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_journals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id       uuid REFERENCES projects(id) ON DELETE SET NULL,
  photo_url        text,
  work_phase       text,
  photo_quality    text CHECK (photo_quality IN ('high', 'medium', 'low')) DEFAULT 'medium',
  ai_summary       text NOT NULL,
  caveats          text[] DEFAULT '{}',
  attendance_context jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for fast org-scoped latest query
CREATE INDEX IF NOT EXISTS idx_site_journals_org_created
  ON site_journals (organization_id, created_at DESC);

-- ── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE site_journals ENABLE ROW LEVEL SECURITY;

-- GC reads own org's journals
CREATE POLICY "gc_read_journals"
  ON site_journals FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- GC inserts journals for own org (enforced at API level; service role used for insert)
CREATE POLICY "gc_insert_journals"
  ON site_journals FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── 3. Storage bucket: site-progress-photos ───────────────────
-- Run via Supabase Dashboard → Storage → New Bucket:
--   Name: site-progress-photos
--   Public: true
--   Max file size: 10 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Or via SQL (requires pg_storage extension):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('site-progress-photos', 'site-progress-photos', true, 10485760,
--         ARRAY['image/jpeg','image/png','image/webp'])
-- ON CONFLICT (id) DO NOTHING;
