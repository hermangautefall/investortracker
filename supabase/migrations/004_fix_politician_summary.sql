DROP MATERIALIZED VIEW IF EXISTS politician_summary;

CREATE MATERIALIZED VIEW politician_summary AS
SELECT
  p.id,
  p.full_name,
  p.chamber,
  p.party,
  p.state,
  COUNT(ct.id)                                            AS total_trades,
  MAX(ct.trade_date)                                      AS last_trade_date,
  COUNT(ct.id) FILTER (WHERE ct.trade_type = 'buy')      AS buy_count,
  COUNT(ct.id) FILTER (WHERE ct.trade_type = 'sell')     AS sell_count
FROM politicians p
LEFT JOIN congress_trades ct ON ct.politician_id = p.id
GROUP BY p.id, p.full_name, p.chamber, p.party, p.state;

CREATE UNIQUE INDEX idx_politician_summary_unique
  ON politician_summary (id);
