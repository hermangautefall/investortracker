-- Per-view refresh function with extended timeout
-- Replaces the single refresh_materialized_views() approach
-- to avoid statement timeout on Supabase free tier.

CREATE OR REPLACE FUNCTION refresh_single_view(view_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set timeout to 5 minutes for this transaction
  SET LOCAL statement_timeout = '300000';

  IF view_name = 'ticker_activity_summary' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ticker_activity_summary;
  ELSIF view_name = 'politician_summary' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY politician_summary;
  ELSIF view_name = 'superinvestor_consensus' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY superinvestor_consensus;
  ELSIF view_name = 'superinvestor_latest_holdings' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY superinvestor_latest_holdings;
  ELSE
    RAISE EXCEPTION 'Unknown view: %', view_name;
  END IF;
END;
$$;
