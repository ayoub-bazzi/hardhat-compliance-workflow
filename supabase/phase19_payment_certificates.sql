-- Phase 19: Payment Certificate Readiness & Compliance Escrow
-- Run in Supabase SQL Editor

-- ── 1. payment_certificates table ─────────────────────────────
CREATE TABLE IF NOT EXISTS payment_certificates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subcontractor_id      uuid NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id            uuid REFERENCES projects(id) ON DELETE SET NULL,

  certificate_number    text NOT NULL,
  amount_claimed        numeric(12,2) NOT NULL,
  period_from           date NOT NULL,
  period_to             date NOT NULL,

  -- Compliance Escrow status machine: pending → approved | escrowed → released
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','escrowed','approved','released')),
  hold_reason           text,                    -- populated when escrowed

  -- Invoice reconciliation
  invoice_url           text,
  invoice_amount_ai     numeric(12,2),           -- Gemini-extracted amount
  discrepancy_flagged   boolean NOT NULL DEFAULT false,
  discrepancy_pct       numeric(5,2),            -- absolute % difference

  -- Risk snapshot at time of review
  risk_score_at_review  integer,

  -- Audit trail
  reviewed_by           text,
  reviewed_at           timestamptz,
  released_by           text,
  released_at           timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pay_cert_org      ON payment_certificates (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pay_cert_sub      ON payment_certificates (subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_pay_cert_status   ON payment_certificates (organization_id, status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION fn_set_pay_cert_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_pay_cert_updated_at
  BEFORE UPDATE ON payment_certificates
  FOR EACH ROW EXECUTE FUNCTION fn_set_pay_cert_updated_at();

-- ── 2. RLS ─────────────────────────────────────────────────────
ALTER TABLE payment_certificates ENABLE ROW LEVEL SECURITY;

-- GC reads and manages own org's certificates
CREATE POLICY "gc_manage_pay_certs"
  ON payment_certificates FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ── 3. Trigger: in-app notification on status change ──────────
CREATE OR REPLACE FUNCTION fn_notify_cert_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sub_org uuid;
  v_company text;
  v_title   text;
  v_body    text;
  v_link    text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT organization_id, company_name
    INTO v_sub_org, v_company
    FROM subcontractors WHERE id = NEW.subcontractor_id;

  v_link := '/gc/finance/certificates';

  IF NEW.status = 'escrowed' THEN
    v_title := 'Payment Escrowed — Compliance Hold';
    v_body  := v_company || ' cert #' || NEW.certificate_number || ' has been escrowed pending compliance clearance.';
  ELSIF NEW.status = 'released' THEN
    v_title := 'Payment Released';
    v_body  := v_company || ' cert #' || NEW.certificate_number || ' of ' || NEW.amount_claimed || ' has been released.';
  ELSIF NEW.status = 'approved' THEN
    v_title := 'Payment Certificate Approved';
    v_body  := v_company || ' cert #' || NEW.certificate_number || ' approved. Ready for release.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO in_app_notifications
    (organization_id, subcontractor_id, event_type, title, body, link)
  VALUES
    (NEW.organization_id, NEW.subcontractor_id, 'GATE_DENIED', v_title, v_body, v_link);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_cert_status
  AFTER UPDATE ON payment_certificates
  FOR EACH ROW EXECUTE FUNCTION fn_notify_cert_status_change();

-- ── 4. Storage bucket: invoice-uploads ────────────────────────
-- Create via Dashboard → Storage → New Bucket:
--   Name: invoice-uploads
--   Public: false (private, signed URLs only)
--   Max file size: 15 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
