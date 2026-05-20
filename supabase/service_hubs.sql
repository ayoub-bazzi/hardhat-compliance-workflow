-- ============================================================
-- HardHat Compliance — Service Hubs Migration (Phase 1)
-- Run AFTER schema.sql and multi_tenancy.sql
-- ============================================================

-- ── New Enums ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.audit_status AS ENUM ('Pending', 'Verified', 'Flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.access_result AS ENUM ('GRANTED', 'DENIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_doc_type AS ENUM ('COI', 'License', 'Golden Thread');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend subcontractors table ───────────────────────────────
-- risk_score: 0 (no risk) → 100 (critical). Computed by the engine.
-- primary_contact_*: on-site point of contact for gate checks.

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS risk_score            SMALLINT NOT NULL DEFAULT 0
    CHECK (risk_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS primary_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT;

-- ── compliance_docs ───────────────────────────────────────────
-- Insurance Vault: COIs, licenses, and Golden Thread documents.
-- This is the source of truth for the Hard-Stop gate decisions.

CREATE TABLE IF NOT EXISTS public.compliance_docs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_type         public.compliance_doc_type NOT NULL,
  doc_name         TEXT NOT NULL,
  audit_status     public.audit_status NOT NULL DEFAULT 'Pending',
  expiry_date      DATE,
  file_path        TEXT,
  notes            TEXT,
  verified_by      UUID REFERENCES auth.users(id),
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inherit org_id from the subcontractor on insert.
CREATE OR REPLACE FUNCTION public.fn_compliance_docs_set_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.subcontractors WHERE id = NEW.subcontractor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_compliance_docs_org_id ON public.compliance_docs;
CREATE TRIGGER tr_compliance_docs_org_id
  BEFORE INSERT ON public.compliance_docs
  FOR EACH ROW EXECUTE FUNCTION public.fn_compliance_docs_set_org_id();

-- Keep updated_at current.
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_compliance_docs_updated_at ON public.compliance_docs;
CREATE TRIGGER tr_compliance_docs_updated_at
  BEFORE UPDATE ON public.compliance_docs
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── site_access_logs ──────────────────────────────────────────
-- Hard-Stop Gate: immutable log of every QR scan decision.
-- denial_reasons captures which specific docs triggered DENIED.

CREATE TABLE IF NOT EXISTS public.site_access_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  result           public.access_result NOT NULL,
  denial_reasons   TEXT[],
  scanned_by       UUID REFERENCES auth.users(id),
  gate_location    TEXT,
  qr_payload       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inherit org_id from the subcontractor on insert.
CREATE OR REPLACE FUNCTION public.fn_site_access_logs_set_org_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.subcontractors WHERE id = NEW.subcontractor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_site_access_logs_org_id ON public.site_access_logs;
CREATE TRIGGER tr_site_access_logs_org_id
  BEFORE INSERT ON public.site_access_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_site_access_logs_set_org_id();

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.compliance_docs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_access_logs ENABLE ROW LEVEL SECURITY;

-- compliance_docs: org-scoped CRUD for GC owner.
CREATE POLICY "compliance_docs_select"
  ON public.compliance_docs FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "compliance_docs_insert"
  ON public.compliance_docs FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() OR organization_id IS NULL);

CREATE POLICY "compliance_docs_update"
  ON public.compliance_docs FOR UPDATE
  USING (organization_id = get_my_org_id());

CREATE POLICY "compliance_docs_delete"
  ON public.compliance_docs FOR DELETE
  USING (organization_id = get_my_org_id());

-- site_access_logs: org-scoped read; any authenticated user may insert
-- (the gate scanner may be a mobile device not tied to a GC session).
CREATE POLICY "site_access_logs_select"
  ON public.site_access_logs FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "site_access_logs_insert"
  ON public.site_access_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── Useful indexes ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_compliance_docs_sub_id
  ON public.compliance_docs(subcontractor_id);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_org_status
  ON public.compliance_docs(organization_id, audit_status);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_expiry
  ON public.compliance_docs(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_site_access_logs_org_created
  ON public.site_access_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_access_logs_sub_id
  ON public.site_access_logs(subcontractor_id);
