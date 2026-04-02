-- ═══════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════

CREATE TABLE politicians (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  chamber     TEXT CHECK (chamber IN ('house', 'senate')),
  party       TEXT,
  state       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE congress_trades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key        TEXT UNIQUE NOT NULL,
  politician_id    UUID REFERENCES politicians(id),
  ticker           TEXT,
  company_name     TEXT,
  trade_type       TEXT CHECK (trade_type IN ('buy', 'sell', 'exchange')),
  amount_min       BIGINT,
  amount_max       BIGINT,
  trade_date       DATE NOT NULL,
  disclosure_date  DATE NOT NULL,
  filing_url       TEXT,
  source           TEXT NOT NULL,
  raw              JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insiders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  cik        TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insider_trades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key        TEXT UNIQUE NOT NULL,
  insider_id       UUID REFERENCES insiders(id),
  ticker           TEXT NOT NULL,
  company_name     TEXT,
  trade_type       TEXT CHECK (trade_type IN ('buy', 'sell', 'option_exercise')),
  shares           BIGINT,
  price_per_share  NUMERIC(12,4),
  total_value      NUMERIC(15,2),
  trade_date       DATE NOT NULL,
  filing_date      DATE NOT NULL,
  form4_url        TEXT,
  source           TEXT NOT NULL DEFAULT 'sec_form4',
  raw              JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT NOT NULL,
  date        DATE NOT NULL,
  close_price NUMERIC(12,4),
  source      TEXT,
  UNIQUE(ticker, date)
);

CREATE TABLE pipeline_state (
  job_name           TEXT PRIMARY KEY,
  last_run           TIMESTAMPTZ,
  last_accession_id  TEXT,
  overlap_hours      INT DEFAULT 48,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name         TEXT NOT NULL,
  status           TEXT CHECK (status IN ('success', 'failed', 'partial')),
  rows_inserted    INT DEFAULT 0,
  rows_skipped     INT DEFAULT 0,
  rows_failed      INT DEFAULT 0,
  error_message    TEXT,
  duration_seconds NUMERIC(8,2),
  ran_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2 tables (ready in schema, populated later)
CREATE TABLE superinvestors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  fund_name  TEXT,
  cik        TEXT UNIQUE,
  aum_usd    BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_holdings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key        TEXT UNIQUE NOT NULL,
  investor_id      UUID REFERENCES superinvestors(id),
  ticker           TEXT NOT NULL,
  company_name     TEXT,
  shares           BIGINT,
  value_usd        BIGINT,
  portfolio_weight NUMERIC(5,2),
  quarter          TEXT NOT NULL,
  filing_date      DATE,
  raw              JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════

CREATE INDEX idx_congress_ticker_date  ON congress_trades (ticker, trade_date DESC);
CREATE INDEX idx_congress_date         ON congress_trades (trade_date DESC);
CREATE INDEX idx_congress_politician   ON congress_trades (politician_id);
CREATE INDEX idx_congress_type         ON congress_trades (trade_type);

CREATE INDEX idx_insider_ticker_date   ON insider_trades (ticker, trade_date DESC);
CREATE INDEX idx_insider_date          ON insider_trades (trade_date DESC);
CREATE INDEX idx_insider_insider       ON insider_trades (insider_id);
CREATE INDEX idx_insider_type          ON insider_trades (trade_type);

CREATE INDEX idx_holdings_investor     ON portfolio_holdings (investor_id);
CREATE INDEX idx_holdings_ticker       ON portfolio_holdings (ticker);
CREATE INDEX idx_holdings_quarter      ON portfolio_holdings (quarter);

-- ═══════════════════════════════════════════════
-- MATERIALIZED VIEWS
-- ═══════════════════════════════════════════════

CREATE MATERIALIZED VIEW ticker_activity_summary AS
SELECT
  ticker,
  'congress'                                        AS data_type,
  COUNT(*)                                          AS trade_count,
  COALESCE(SUM(amount_max), 0)                      AS total_volume,
  MAX(trade_date)                                   AS last_trade,
  COUNT(*) FILTER (WHERE trade_type = 'buy')        AS buy_count,
  COUNT(*) FILTER (WHERE trade_type = 'sell')       AS sell_count
FROM congress_trades
WHERE ticker IS NOT NULL
GROUP BY ticker
UNION ALL
SELECT
  ticker,
  'insider'                                         AS data_type,
  COUNT(*)                                          AS trade_count,
  COALESCE(SUM(total_value), 0)                     AS total_volume,
  MAX(trade_date)                                   AS last_trade,
  COUNT(*) FILTER (WHERE trade_type = 'buy')        AS buy_count,
  COUNT(*) FILTER (WHERE trade_type = 'sell')       AS sell_count
FROM insider_trades
GROUP BY ticker;

-- UNIQUE index required for REFRESH CONCURRENTLY (no table lock)
CREATE UNIQUE INDEX idx_ticker_summary_unique
  ON ticker_activity_summary (ticker, data_type);

CREATE MATERIALIZED VIEW politician_summary AS
SELECT
  p.id,
  p.full_name,
  p.chamber,
  p.party,
  p.state,
  COUNT(ct.id)                                              AS total_trades,
  MAX(ct.trade_date)                                        AS last_trade_date,
  COUNT(ct.id) FILTER (WHERE ct.trade_type = 'buy')        AS buy_count,
  COUNT(ct.id) FILTER (WHERE ct.trade_type = 'sell')       AS sell_count
FROM politicians p
LEFT JOIN congress_trades ct ON ct.politician_id = p.id
GROUP BY p.id, p.full_name, p.chamber, p.party, p.state;

CREATE UNIQUE INDEX idx_politician_summary_unique
  ON politician_summary (id);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'politicians','congress_trades','insiders','insider_trades',
    'stock_prices','pipeline_state','pipeline_runs',
    'superinvestors','portfolio_holdings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY public_read ON %I FOR SELECT USING (true)', tbl
    );
  END LOOP;
END $$;
