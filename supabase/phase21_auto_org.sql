-- ============================================================
-- HardHat Compliance — Phase 21: Auto-Org Engine & JWT Claims
--
-- Problem: auth.users.raw_app_meta_data has no organization_id,
-- so (auth.jwt() -> 'app_metadata' ->> 'organization_id') is NULL
-- for every user. get_my_org_id() falls back to a profiles lookup,
-- which works — but the old permissive "Authenticated users can
-- view projects" policy may still be live, making all projects
-- visible to everyone regardless of org.
--
-- Fix:
--   1. fn_handle_new_user   — auto-profile + auto-org at signup.
--   2. fn_sync_org_to_jwt   — push org_id to app_metadata whenever
--                             profiles.organization_id changes.
--                             Combined with the existing refreshSession()
--                             call in onboarding/actions.ts, the JWT is
--                             fully hydrated before the first dashboard load.
--   3. get_my_org_id()      — JWT-first with profiles fallback.
--   4. Retroactive sync     — backfill app_metadata for existing users.
--   5. Retroactive auto-org — create placeholder orgs for GC users
--                             who have none (missed onboarding, test accounts).
--   6. Drop old permissive projects policy — closes the visibility leak.
--
-- Run ONCE in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS / ON CONFLICT guards.
-- ============================================================

-- ── Step 1: fn_handle_new_user ────────────────────────────────
-- Fires on every new auth.users INSERT.
--
-- Always:   creates a profiles row.
-- GC only:  creates a placeholder organization, links it to profiles,
--           and writes organization_id to raw_app_meta_data so the
--           very first JWT (issued during signup) already carries it.
--
-- Note: normal web signups that go through the onboarding form will
-- have their placeholder org name overwritten by fn_sync_org_to_jwt
-- (Step 2) when onboarding/actions.ts calls profiles UPDATE + refreshSession().

CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role     public.user_role;
  v_app_role public.app_role;
  v_org_id   UUID;
BEGIN
  -- Honour role passed in signup metadata; default to GC for new signups.
  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::public.user_role,
    'gc'::public.user_role
  );

  v_app_role := CASE v_role
    WHEN 'subcontractor' THEN 'subcontractor'::public.app_role
    ELSE                       'project_manager'::public.app_role
  END;

  -- Always create the profile row.
  INSERT INTO public.profiles (id, full_name, role, app_role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    v_role,
    v_app_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- GC only: auto-create a placeholder org.
  IF v_role = 'gc' THEN
    INSERT INTO public.organizations (
      name,
      owner_id
    ) VALUES (
      COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data ->> 'company_name'), ''),
        split_part(NEW.email, '@', 1) || '''s Organization'
      ),
      NEW.id
    )
    RETURNING id INTO v_org_id;

    -- Link org to profile.
    UPDATE public.profiles
    SET organization_id = v_org_id
    WHERE id = NEW.id;

    -- Push org_id into app_metadata (service-level: cannot be forged by users).
    UPDATE auth.users
    SET raw_app_meta_data =
      raw_app_meta_data || jsonb_build_object('organization_id', v_org_id::text)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_new_user();


-- ── Step 2: fn_sync_org_to_jwt ────────────────────────────────
-- Fires whenever profiles.organization_id is set or changed.
--
-- This is the live integration with onboarding/actions.ts:
--   1. Onboarding form submits → profiles UPDATE sets organization_id.
--   2. This trigger immediately writes it to raw_app_meta_data.
--   3. The existing supabase.auth.refreshSession() call in the action
--      then issues a NEW JWT that carries the org_id claim.
--   4. All subsequent RLS checks via get_my_org_id() hit the JWT
--      fast-path — no extra DB round-trip.

CREATE OR REPLACE FUNCTION public.fn_sync_org_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL
     AND (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
  THEN
    UPDATE auth.users
    SET raw_app_meta_data =
      raw_app_meta_data || jsonb_build_object('organization_id', NEW.organization_id::text)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_to_jwt ON public.profiles;
CREATE TRIGGER trg_sync_org_to_jwt
  AFTER UPDATE OF organization_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_org_to_jwt();


-- ── Step 3: Update get_my_org_id() ────────────────────────────
-- JWT app_metadata is the fast path (zero extra DB hit).
-- profiles.organization_id is the safety fallback for sessions
-- issued before Phase 21 (stale JWT that predates the trigger).

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid,
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
$$;


-- ── Step 4: Retroactive JWT sync ──────────────────────────────
-- Users who completed onboarding BEFORE Phase 21 have a correct
-- profiles.organization_id but raw_app_meta_data is still null.
-- Backfill it now. Idempotent — jsonb || merge is safe to re-run.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id, p.organization_id
    FROM   public.profiles p
    WHERE  p.organization_id IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      raw_app_meta_data || jsonb_build_object('organization_id', r.organization_id::text)
    WHERE id = r.id;
  END LOOP;
END;
$$;


-- ── Step 5: Retroactive auto-org ──────────────────────────────
-- GC users who signed up before the trigger and never completed
-- onboarding have no org at all. Create placeholder orgs for them.
-- They can update the name in /gc/settings later.

DO $$
DECLARE
  r        RECORD;
  v_org_id UUID;
BEGIN
  FOR r IN
    SELECT p.id, u.email, u.raw_user_meta_data
    FROM   public.profiles p
    JOIN   auth.users u ON u.id = p.id
    WHERE  p.role = 'gc'
      AND  p.organization_id IS NULL
  LOOP
    INSERT INTO public.organizations (name, owner_id)
    VALUES (
      COALESCE(
        NULLIF(trim(r.raw_user_meta_data ->> 'company_name'), ''),
        split_part(r.email, '@', 1) || '''s Organization'
      ),
      r.id
    )
    RETURNING id INTO v_org_id;

    UPDATE public.profiles
    SET organization_id = v_org_id
    WHERE id = r.id;

    -- The trg_sync_org_to_jwt trigger fires on the UPDATE above,
    -- so this explicit metadata write is belt-and-suspenders only.
    UPDATE auth.users
    SET raw_app_meta_data =
      raw_app_meta_data || jsonb_build_object('organization_id', v_org_id::text)
    WHERE id = r.id;
  END LOOP;
END;
$$;


-- ── Step 6: Seal the projects visibility leak ─────────────────
-- Drop the old Sprint-2 permissive policy if it still exists.
-- The correct org-scoped policy was written in phase20_tenant_isolation.sql
-- and now benefits from the JWT-first get_my_org_id() above.

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;

-- Recreate org_projects_select in case phase20 hasn't been applied yet.
DROP POLICY IF EXISTS "org_projects_select" ON public.projects;

CREATE POLICY "org_projects_select"
  ON public.projects FOR SELECT
  USING (
    -- GC: sees their own org's projects (via JWT fast-path in get_my_org_id).
    organization_id = get_my_org_id()
    OR
    -- Sub: sees only projects they are assigned to (user_id binding from phase20).
    id IN (
      SELECT project_id FROM public.subcontractors
      WHERE user_id = auth.uid()
    )
  );
