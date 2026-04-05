-- ─── Superinvestor consensus view ────────────────────────────────────────────
-- Most widely held stocks across all superinvestors (latest quarter data)

CREATE MATERIALIZED VIEW superinvestor_consensus AS
SELECT
  ph.ticker,
  MAX(ph.company_name)               AS company_name,
  COUNT(DISTINCT ph.investor_id)     AS investor_count,
  SUM(ph.value_usd)                  AS total_value_usd,
  AVG(ph.portfolio_weight)           AS avg_weight,
  MAX(ph.quarter)                    AS latest_quarter
FROM portfolio_holdings ph
WHERE ph.ticker IS NOT NULL
  AND ph.ticker != ''
GROUP BY ph.ticker
ORDER BY investor_count DESC;

-- UNIQUE index required for REFRESH CONCURRENTLY (no table lock)
CREATE UNIQUE INDEX idx_superinvestor_consensus_unique
  ON superinvestor_consensus (ticker);


-- ─── Latest holdings per investor ────────────────────────────────────────────
-- Most recent quarter only, one row per investor × ticker

CREATE MATERIALIZED VIEW superinvestor_latest_holdings AS
SELECT DISTINCT ON (ph.investor_id, ph.ticker)
  ph.investor_id,
  ph.ticker,
  ph.company_name,
  ph.shares,
  ph.value_usd,
  ph.portfolio_weight,
  ph.quarter,
  si.name       AS investor_name,
  si.fund_name
FROM portfolio_holdings ph
JOIN superinvestors si ON si.id = ph.investor_id
ORDER BY ph.investor_id, ph.ticker, ph.quarter DESC;

-- UNIQUE index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_latest_holdings_unique
  ON superinvestor_latest_holdings (investor_id, ticker);


-- ─── Update refresh function to include new views ─────────────────────────────

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ticker_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY politician_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY superinvestor_consensus;
  REFRESH MATERIALIZED VIEW CONCURRENTLY superinvestor_latest_holdings;
END;
$$;
