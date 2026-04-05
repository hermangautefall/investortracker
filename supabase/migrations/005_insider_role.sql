-- Add primary_role and primary_company columns to insiders table
ALTER TABLE insiders
  ADD COLUMN IF NOT EXISTS primary_role TEXT,
  ADD COLUMN IF NOT EXISTS primary_company TEXT;

-- Backfill from existing raw JSONB in insider_trades
-- raw.raw.Position contains the role, raw.company_name contains the company
UPDATE insiders i
SET
  primary_role    = sub.position,
  primary_company = sub.company_name
FROM (
  SELECT DISTINCT ON (it.insider_id)
    it.insider_id,
    it.raw->'raw'->>'Position'  AS position,
    it.raw->>'company_name'     AS company_name
  FROM insider_trades it
  WHERE it.insider_id IS NOT NULL
    AND (
      it.raw->'raw'->>'Position' IS NOT NULL
      OR it.raw->>'company_name' IS NOT NULL
    )
  ORDER BY it.insider_id, it.trade_date DESC NULLS LAST
) sub
WHERE i.id = sub.insider_id
  AND (i.primary_role IS NULL OR i.primary_company IS NULL);
