-- 13F holdings may not have a ticker (CUSIP-only positions).
-- Make ticker nullable so the loader can insert all positions.
ALTER TABLE portfolio_holdings ALTER COLUMN ticker DROP NOT NULL;
