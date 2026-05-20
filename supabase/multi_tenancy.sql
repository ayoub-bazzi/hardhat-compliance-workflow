-- ============================================================
-- HardHat Compliance — Multi-Tenancy Migration (Task 14)
-- The Iron Gate: Org-Scoped RLS for Every Table
--
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================

-- ── Step 1: Create organizations table ───────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  size       TEXT,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ── Step 2: Add organization_id columns ──────────────────────
-- All nullable so existing rows are not broken.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ── Step 3: Helper — current user's org id ───────────────────
-- Returns NULL for unboarded users and subcontractor-role users.
-- Used in every RLS policy below for zero-cost inline lookup.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── Step 4: Trigger — auto-populate org_id on documents ──────
-- When a subcontractor uploads a document they don't supply an
-- org_id, so we inherit it from their subcontractor record.

CREATE OR REPLACE FUNCTION public.set_document_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.subcontractors
    WHERE id = NEW.subcontractor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_documents_set_org_id ON public.documents;
CREATE TRIGGER tr_documents_set_org_id
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_document_org_id();

-- ── Step 5: Drop old permissive dev-phase policies ───────────

DROP POLICY IF EXISTS "Authenticated users can view projects"         ON public.projects;
DROP POLICY IF EXISTS "DEV: Authenticated users can insert projects"  ON public.projects;
DROP POLICY IF EXISTS "DEV: Authenticated users can update projects"  ON public.projects;
DROP POLICY IF EXISTS "DEV: Authenticated users can delete projects"  ON public.projects;

DROP POLICY IF EXISTS "Authenticated users can view subcontractors"        ON public.subcontractors;
DROP POLICY IF EXISTS "DEV: Authenticated users can insert subcontractors" ON public.subcontractors;
DROP POLICY IF EXISTS "DEV: Authenticated users can update subcontractors" ON public.subcontractors;
DROP POLICY IF EXISTS "DEV: Authenticated users can delete subcontractors" ON public.subcontractors;

DROP POLICY IF EXISTS "Authenticated users can view documents"        ON public.documents;
DROP POLICY IF EXISTS "DEV: Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "DEV: Authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "DEV: Authenticated users can delete documents" ON public.documents;

-- ── Step 6: organizations RLS ─────────────────────────────────

CREATE POLICY "org_select"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid() OR id = get_my_org_id());

-- Any authenticated user may create an org (runs once at onboarding).
CREATE POLICY "org_insert"
  ON public.organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_update"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "org_delete"
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

-- ── Step 7: projects RLS ──────────────────────────────────────
-- GC: own org's projects.
-- Sub: projects they are assigned to (so the portal join works).

CREATE POLICY "org_projects_select"
  ON public.projects FOR SELECT
  USING (
    organization_id = get_my_org_id()
    OR id IN (
      SELECT project_id FROM public.subcontractors
      WHERE contact_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "org_projects_insert"
  ON public.projects FOR INSERT
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "org_projects_update"
  ON public.projects FOR UPDATE
  USING (organization_id = get_my_org_id());

CREATE POLICY "org_projects_delete"
  ON public.projects FOR DELETE
  USING (organization_id = get_my_org_id());

-- ── Step 8: subcontractors RLS ────────────────────────────────
-- GC: own org's subcontractor records.
-- Sub: own records matched by email (read-only; only GC can insert/update/delete).

CREATE POLICY "org_subcontractors_select"
  ON public.subcontractors FOR SELECT
  USING (
    organization_id = get_my_org_id()
    OR contact_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "org_subcontractors_insert"
  ON public.subcontractors FOR INSERT
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "org_subcontractors_update"
  ON public.subcontractors FOR UPDATE
  USING (organization_id = get_my_org_id());

CREATE POLICY "org_subcontractors_delete"
  ON public.subcontractors FOR DELETE
  USING (organization_id = get_my_org_id());

-- ── Step 9: documents RLS ─────────────────────────────────────
-- GC: own org's documents.
-- Sub: documents for their subcontractor records (read + upload).
-- org_id is auto-populated by the trigger above for sub uploads.

CREATE POLICY "org_documents_select"
  ON public.documents FOR SELECT
  USING (
    organization_id = get_my_org_id()
    OR subcontractor_id IN (
      SELECT id FROM public.subcontractors
      WHERE contact_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "org_documents_insert"
  ON public.documents FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    OR subcontractor_id IN (
      SELECT id FROM public.subcontractors
      WHERE contact_email = (auth.jwt() ->> 'email')
    )
  );

-- Only the owning org can approve/reject/update documents.
CREATE POLICY "org_documents_update"
  ON public.documents FOR UPDATE
  USING (organization_id = get_my_org_id());

CREATE POLICY "org_documents_delete"
  ON public.documents FOR DELETE
  USING (organization_id = get_my_org_id());

-- ── Step 10: profiles — allow INSERT for new users ───────────
-- (The DEV insert policy is preserved from storage_and_rls.sql;
--  this is only needed if it was accidentally dropped.)
CREATE POLICY IF NOT EXISTS "allow_own_profile_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
