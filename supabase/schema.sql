-- ============================================================
-- HardHat Compliance — Database Schema
-- Run this in the Supabase SQL Editor (in order)
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM ('gc', 'subcontractor');
CREATE TYPE public.project_status AS ENUM ('active', 'archived');
CREATE TYPE public.compliance_status AS ENUM ('compliant', 'warning', 'non_compliant');
CREATE TYPE public.document_type AS ENUM ('COI', 'Certified Payroll', 'W9');
CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected');

-- ── Tables ───────────────────────────────────────────────────

-- Profiles: one row per authenticated user, linked to auth.users
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  company_name TEXT,
  role         public.user_role NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects: created and owned by a GC
CREATE TABLE public.projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name       TEXT NOT NULL,
  location   TEXT,
  status     public.project_status NOT NULL DEFAULT 'active'
);

-- Subcontractors: linked to a project
CREATE TABLE public.subcontractors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_name       TEXT NOT NULL,
  contact_email      TEXT NOT NULL,
  compliance_status  public.compliance_status NOT NULL DEFAULT 'compliant',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents: linked to a subcontractor
CREATE TABLE public.documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id  UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  type              public.document_type NOT NULL,
  status            public.document_status NOT NULL DEFAULT 'pending',
  expiry_date       DATE,
  file_path         TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations: run these if the tables already exist
-- ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- system_logs: cron / background job audit log — run this to create the table
/*
CREATE TABLE public.system_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event      TEXT NOT NULL,
  level      TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message    TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated GC users can read logs; only service role can insert
CREATE POLICY "Authenticated users can view system logs"
  ON public.system_logs FOR SELECT USING (auth.role() = 'authenticated');
*/

-- document_events: audit trail — run this to create the new table
/*
CREATE TABLE public.document_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('uploaded','ai_review','notification_sent','manual_override')),
  actor        TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document events"
  ON public.document_events FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "DEV: Authenticated users can insert document events"
  ON public.document_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
*/

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents     ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read and update their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: authenticated users can read all; insert/update/delete locked down for now
CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT USING (auth.role() = 'authenticated');

-- Subcontractors: authenticated users can read all
CREATE POLICY "Authenticated users can view subcontractors"
  ON public.subcontractors FOR SELECT USING (auth.role() = 'authenticated');

-- Documents: authenticated users can read all
CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT USING (auth.role() = 'authenticated');
