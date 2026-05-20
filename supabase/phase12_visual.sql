-- Phase 12: Visual Verification & AI Face Match
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Subcontractor profile photo ──────────────────────────────────────────
ALTER TABLE subcontractors
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- ── 2. Site access log — photo & face-match columns ─────────────────────────
ALTER TABLE site_access_logs
  ADD COLUMN IF NOT EXISTS photo_url         TEXT,
  ADD COLUMN IF NOT EXISTS face_match_score  INTEGER,
  ADD COLUMN IF NOT EXISTS face_match_result TEXT
    CHECK (face_match_result IN (
      'match',
      'suspected_impersonation',
      'no_profile_photo',
      'error'
    ));

-- ── 3. Storage bucket (run in Supabase Dashboard → Storage if preferred) ────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-entry-photos',
  'site-entry-photos',
  true,   -- public: GC dashboard reads photos directly via URL in real-time feed
  5242880,
  ARRAY['image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is already public=true, this policy is belt-and-suspenders)
CREATE POLICY "site_entry_photos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-entry-photos');

-- Only service-role may INSERT (API route uses service client which bypasses RLS)
-- No authenticated INSERT policy needed.

-- ── 4. Allow UPDATE on site_access_logs for photo/face-match columns ─────────
-- Currently the table has no UPDATE RLS policy (immutable log). The face-match
-- API route uses the service client, which bypasses RLS, so no policy is needed.
-- This comment documents the intentional design.

-- ── 5. Supabase Realtime — enable UPDATE events ───────────────────────────────
-- In Supabase Dashboard → Database → Replication:
--   Enable BOTH Insert AND Update for site_access_logs
--   (so the site monitor receives photo data when face match completes)
