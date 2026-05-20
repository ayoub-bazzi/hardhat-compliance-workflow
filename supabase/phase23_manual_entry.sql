-- Add pending_verification to document_status enum for manual entry flow.
-- Documents saved without AI scan are held in this state until a GC explicitly approves them.
ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'pending_verification';
