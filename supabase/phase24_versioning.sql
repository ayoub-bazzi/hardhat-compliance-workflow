-- Phase 24: Document Versioning
-- Adds is_current to track one active version per (subcontractor_id, type).
-- Golden Rule: only an approval can displace an existing approved current version.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing rows.
-- For each (subcontractor_id, type) group, mark only the single "best" most-recent
-- document as current. Priority: approved > pending/pending_verification > rejected.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY subcontractor_id, type
      ORDER BY
        CASE status
          WHEN 'approved'             THEN 0
          WHEN 'pending'              THEN 1
          WHEN 'pending_verification' THEN 1
          ELSE 2  -- rejected
        END,
        created_at DESC
    ) AS rn
  FROM documents
)
UPDATE documents
SET    is_current = (ranked.rn = 1)
FROM   ranked
WHERE  documents.id = ranked.id;

-- Composite index for fast "current-only" and "history" queries.
CREATE INDEX IF NOT EXISTS idx_documents_sub_type_current
  ON documents (subcontractor_id, type, is_current);
