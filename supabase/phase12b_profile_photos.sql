-- ============================================================
-- Phase 12b — Profile Photo Enrollment
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Public bucket: profile photos must be fetchable by the gate verify-face
-- API (which runs server-side with the service role but fetches images via
-- the public CDN URL stored in profile_photo_url).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,  -- 5 MB cap: JPEG portraits are small
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
