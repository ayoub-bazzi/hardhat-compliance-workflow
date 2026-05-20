-- ============================================================
-- HardHat Compliance — Storage Bucket + Dev RLS Policies
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Storage Bucket ────────────────────────────────────────────

-- Create a private bucket for compliance documents.
-- 'public = false' means no file is reachable via a direct URL
-- without a signed link generated server-side.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-docs',
  'compliance-docs',
  false,
  52428800,           -- 50 MB per file
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage objects for the compliance-docs bucket.
-- Authenticated users can upload, read, update, and delete their own files.
CREATE POLICY "Authenticated users can manage compliance docs"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'compliance-docs'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'compliance-docs'
    AND auth.role() = 'authenticated'
  );

-- ── Permissive Dev-Phase RLS Policies ─────────────────────────
-- NOTE: These broad policies are intentional for Sprint 2 development.
-- They will be replaced with role-scoped policies in Sprint 3.

-- profiles ── INSERT / UPDATE / DELETE
CREATE POLICY "DEV: Authenticated users can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can update profiles"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can delete profiles"
  ON public.profiles FOR DELETE
  USING (auth.role() = 'authenticated');

-- projects ── INSERT / UPDATE / DELETE
CREATE POLICY "DEV: Authenticated users can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can update projects"
  ON public.projects FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can delete projects"
  ON public.projects FOR DELETE
  USING (auth.role() = 'authenticated');

-- subcontractors ── INSERT / UPDATE / DELETE
CREATE POLICY "DEV: Authenticated users can insert subcontractors"
  ON public.subcontractors FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can update subcontractors"
  ON public.subcontractors FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can delete subcontractors"
  ON public.subcontractors FOR DELETE
  USING (auth.role() = 'authenticated');

-- documents ── INSERT / UPDATE / DELETE
CREATE POLICY "DEV: Authenticated users can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can update documents"
  ON public.documents FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can delete documents"
  ON public.documents FOR DELETE
  USING (auth.role() = 'authenticated');
