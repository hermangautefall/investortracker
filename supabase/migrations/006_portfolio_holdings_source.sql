-- Add source column to portfolio_holdings (required by 13F loader)
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS source TEXT;
