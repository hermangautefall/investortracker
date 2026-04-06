-- Migration 009: backfill_state table for resumable historical backfill jobs

CREATE TABLE IF NOT EXISTS backfill_state (
    job_name       TEXT        PRIMARY KEY,
    last_cik       TEXT,
    total_processed INTEGER    DEFAULT 0,
    total_inserted  INTEGER    DEFAULT 0,
    completed      BOOLEAN     DEFAULT FALSE,
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
