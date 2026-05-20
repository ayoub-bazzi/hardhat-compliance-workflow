-- ============================================================
-- Phase 25: Project Lifecycle — Cascading Delete Constraints
-- Run in Supabase SQL editor.
-- ============================================================
-- Re-declares critical FKs with ON DELETE CASCADE so that
-- deleting a project atomically removes all descendant rows.
-- ============================================================

-- subcontractors → projects
ALTER TABLE public.subcontractors
  DROP CONSTRAINT IF EXISTS subcontractors_project_id_fkey,
  ADD CONSTRAINT subcontractors_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- documents → subcontractors
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_subcontractor_id_fkey,
  ADD CONSTRAINT documents_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- document_events → documents
ALTER TABLE public.document_events
  DROP CONSTRAINT IF EXISTS document_events_document_id_fkey,
  ADD CONSTRAINT document_events_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

-- compliance_docs → subcontractors
ALTER TABLE public.compliance_docs
  DROP CONSTRAINT IF EXISTS compliance_docs_subcontractor_id_fkey,
  ADD CONSTRAINT compliance_docs_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- safety_documents → subcontractors
ALTER TABLE public.safety_documents
  DROP CONSTRAINT IF EXISTS safety_documents_subcontractor_id_fkey,
  ADD CONSTRAINT safety_documents_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- audit_events → subcontractors
ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_subcontractor_id_fkey,
  ADD CONSTRAINT audit_events_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- nudge_logs → subcontractors
ALTER TABLE public.nudge_logs
  DROP CONSTRAINT IF EXISTS nudge_logs_subcontractor_id_fkey,
  ADD CONSTRAINT nudge_logs_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- notification_logs → subcontractors
ALTER TABLE public.notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_subcontractor_id_fkey,
  ADD CONSTRAINT notification_logs_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- site_access_logs → subcontractors
ALTER TABLE public.site_access_logs
  DROP CONSTRAINT IF EXISTS site_access_logs_subcontractor_id_fkey,
  ADD CONSTRAINT site_access_logs_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- prequal_submissions → subcontractors
ALTER TABLE public.prequal_submissions
  DROP CONSTRAINT IF EXISTS prequal_submissions_subcontractor_id_fkey,
  ADD CONSTRAINT prequal_submissions_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- gc_notifications → subcontractors (nullable FK — only drop if exists)
ALTER TABLE public.gc_notifications
  DROP CONSTRAINT IF EXISTS gc_notifications_subcontractor_id_fkey;
ALTER TABLE public.gc_notifications
  ADD CONSTRAINT gc_notifications_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- payment_certificates → subcontractors
ALTER TABLE public.payment_certificates
  DROP CONSTRAINT IF EXISTS payment_certificates_subcontractor_id_fkey,
  ADD CONSTRAINT payment_certificates_subcontractor_id_fkey
    FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;

-- project_risk_history → projects
ALTER TABLE public.project_risk_history
  DROP CONSTRAINT IF EXISTS project_risk_history_project_id_fkey,
  ADD CONSTRAINT project_risk_history_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
