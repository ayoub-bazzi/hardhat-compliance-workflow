-- ============================================================
-- HardHat Compliance — Phase 20: Tenant Isolation Hardening
-- Closes the contact_email identity vulnerability.
--
-- Problem: subcontractor records were matched to auth sessions by
-- a plain-text email string. Any user whose email matched a
-- contact_email anywhere in the DB gained access to that record
-- and all its documents — across all tenants.
--
-- Fix: add user_id FK to subcontractors; replace all email-based
-- RLS clauses with user_id = auth.uid(); gate the one-time
-- binding behind a SECURITY DEFINER function.
--
-- Run ONCE in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================

-- ── Step 1: Add user_id to subcontractors ────────────────────
-- Nullable so existing rows are not broken before they are claimed.

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Partial index — only indexes claimed rows (unclaimed stay out of it).
CREATE INDEX IF NOT EXISTS idx_subcontractors_user_id
  ON public.subcontractors(user_id)
  WHERE user_id IS NOT NULL;

-- ── Step 2: Drop every vulnerable email-based policy ─────────

DROP POLICY IF EXISTS "org_projects_select"        ON public.projects;
DROP POLICY IF EXISTS "org_subcontractors_select"  ON public.subcontractors;
DROP POLICY IF EXISTS "org_documents_select"       ON public.documents;
DROP POLICY IF EXISTS "org_documents_insert"       ON public.documents;

-- ── Step 3: projects SELECT ───────────────────────────────────
-- GC:  sees their org's projects.
-- Sub: sees projects linked to subcontractor records bound to their user_id.

CREATE POLICY "org_projects_select"
  ON public.projects FOR SELECT
  USING (
    organization_id = get_my_org_id()
    OR id IN (
      SELECT project_id FROM public.subcontractors
      WHERE user_id = auth.uid()
    )
  );

-- ── Step 4: subcontractors SELECT ────────────────────────────
-- GC:  sees all records in their org.
-- Sub: sees only records where user_id is bound to their auth.uid().
--      The contact_email OR clause is removed entirely.

CREATE POLICY "org_subcontractors_select"
  ON public.subcontractors FOR SELECT
  USING (
    organization_id = get_my_org_id()
    OR user_id = auth.uid()
  );

-- ── Step 5: documents SELECT ──────────────────────────────────
-- GC:  sees all documents in their org.
-- Sub: sees documents whose parent subcontractor is bound to their auth.uid().

CREATE POLICY "org_documents_select"
  ON public.documents FOR SELECT
  USING (
    organization_id = get_my_org_id()
    OR subcontractor_id IN (
      SELECT id FROM public.subcontractors
      WHERE user_id = auth.uid()
    )
  );

-- ── Step 6: documents INSERT ──────────────────────────────────
-- GC:  can insert into their org's documents.
-- Sub: can upload documents only for their own claimed subcontractor records.

CREATE POLICY "org_documents_insert"
  ON public.documents FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    OR subcontractor_id IN (
      SELECT id FROM public.subcontractors
      WHERE user_id = auth.uid()
    )
  );

-- ── Step 7: fn_claim_subcontractor_identity ───────────────────
-- SECURITY DEFINER: runs as postgres, bypassing RLS, so it can
-- see and update unclaimed rows that the caller cannot yet read.
--
-- Called server-side on every subcontractor portal load.
-- Idempotent: if already claimed, 0 rows are updated and it returns nothing.
--
-- Claim rule:
--   contact_email = caller's JWT email  AND  user_id IS NULL
--
-- The AND user_id IS NULL guard means once a record is claimed
-- by any auth.uid(), it is permanently locked. A second user with
-- the same email cannot hijack it.
--
-- Returns the UUIDs of rows that were newly claimed this invocation.

CREATE OR REPLACE FUNCTION public.fn_claim_subcontractor_identity()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_uid   UUID;
BEGIN
  v_email := auth.jwt() ->> 'email';
  v_uid   := auth.uid();

  -- Must be an authenticated session with a known email.
  IF v_email IS NULL OR v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Atomically claim all unclaimed records matching this email.
  RETURN QUERY
    UPDATE public.subcontractors
    SET    user_id = v_uid
    WHERE  contact_email = v_email
      AND  user_id IS NULL
    RETURNING id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_claim_subcontractor_identity TO authenticated;
