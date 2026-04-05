# Project Context for Claude Code

## What this project is

A financial transparency platform that tracks congressional
stock trades (STOCK Act disclosures) and insider trades
(SEC Form 4 filings). Data is sourced from free public APIs
and presented in a clean, searchable interface.

> **Site name is DataHeimdall** (dataheimdall.com).
> The [SITE NAME] placeholder has been replaced everywhere.
> Do not reintroduce the placeholder. Use "DataHeimdall" in all
> user-facing text, page titles, meta tags, UI copy, and email
> content.

All code, comments, and UI text must be in English.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Pipeline | Python 3.12 (apps/pipeline/) |
| Web hosting | Vercel (auto-deploy on push to main) |
| Scheduling | GitHub Actions (daily at 08:00 UTC) |
| SEC data | edgartools Python library |
| Stock prices | yfinance (primary) + Finnhub (fallback) |
| Validation | Pydantic v2 |
| Ticker mapping | OpenFIGI API |
| Monitoring | Telegram bot alerts on pipeline failure |

---

## Project structure

```
investortracker/
├── app/
│   ├── (marketing)/page.tsx       Landing page
│   ├── politicians/               Congressional trade tracker
│   ├── insiders/                  Insider trade tracker
│   ├── tickers/[ticker]/          Per-ticker activity page
│   ├── superinvestors/            Super investor list + profile pages
│   ├── superinvestor-consensus/   Most widely held stocks view
│   ├── portfolio-copier/          Phase 3 – not yet built
│   └── api/v1/                    All API endpoints
├── apps/pipeline/
│   ├── core/                      Shared utilities
│   │   ├── logger.py
│   │   ├── db.py
│   │   ├── checkpoint.py
│   │   ├── dedup.py
│   │   ├── rate_limiter.py
│   │   └── validator.py
│   ├── scrapers/                  Data fetchers
│   ├── transformers/              Normalization and validation
│   ├── enrichers/                 Stock price fetching
│   ├── loaders/                   Database writers
│   ├── aggregators/               Materialized view refresh
│   ├── jobs/                      Runnable pipeline jobs
│   ├── backfill/                  One-time historical data load
│   └── monitor/                   Telegram alerts
├── components/
│   ├── layout/Header.tsx
│   ├── badges/PartyBadge.tsx
│   ├── badges/TradeBadge.tsx
│   └── analytics/Analytics.tsx
├── lib/
│   ├── api-response.ts            Shared response helpers
│   ├── constants.ts               Shared constants
│   ├── database.types.ts          Auto-generated from Supabase
│   └── formatters.ts              Date, currency, ticker formatting
├── supabase/migrations/           Database migration files
├── .github/workflows/
│   ├── pipeline.yml               Daily data pipeline
│   └── twitter_bot.yml            Auto-post on new trades
└── CLAUDE.md                      This file
```

---

## Database schema

### Core tables

| Table | Purpose |
|---|---|
| `politicians` | Congressional member profiles |
| `congress_trades` | STOCK Act trade disclosures |
| `insiders` | Insider profiles (executives, major shareholders) |
| `insider_trades` | SEC Form 4 transactions |
| `stock_prices` | Cached daily closing prices |
| `pipeline_state` | Incremental checkpoint per job |
| `pipeline_runs` | Execution log for every job run |
| `superinvestors` | Super investor profiles (name, fund, CIK) |
| `portfolio_holdings` | Quarterly 13F holdings per investor |

### Materialized views (refreshed daily)

| View | Purpose |
|---|---|
| `ticker_activity_summary` | Trade counts and volume per ticker |
| `politician_summary` | Trade stats per politician |
| `superinvestor_consensus` | Most widely held stocks across all investors |
| `superinvestor_latest_holdings` | Most recent quarter per investor × ticker |

### Key column conventions
- Every insertable table has a `dedup_key TEXT UNIQUE NOT NULL`
- Every row stores original source data in `raw JSONB`
- Every row identifies its origin in `source TEXT`
- Timestamps use `TIMESTAMPTZ`, dates use `DATE`
- `portfolio_holdings.dedup_key`: MD5 of `cik + cusip_or_ticker_or_company + quarter`
- Quarter format is `"2025Q4"` (year first, no space) — not `"Q4 2025"`
- `portfolio_holdings.ticker` is nullable — many 13F positions are CUSIP-only

---

## API conventions

- All endpoints live under `/api/v1/` (versioned from day one)
- All responses use the shape from `lib/api-response.ts`:
  ```json
  {
    "data": [...],
    "meta": {
      "total": 245,
      "page": 1,
      "per_page": 50,
      "last_updated": "2026-03-28T10:00:00Z"
    }
  }
  ```
- All list endpoints support `?page=` and `?per_page=` (max 100)
- All routes have `export const revalidate = 60` (ISR, 60 seconds)
- `/api/v1/health` has `export const revalidate = 0` (never cached)
- Error responses: `{ "error": "message" }` with appropriate HTTP status
- Never return more than 100 rows per page (cap per_page to MAX_PAGE_SIZE)
- Rate limiting lives in `src/proxy.ts` (not `middleware.ts`). Next.js 16 uses
  `proxy.ts` as the middleware entry point — `middleware.ts` was already
  occupied by the Nextbase Lite boilerplate. Do not create `src/middleware.ts`.

---

## Current pipeline status

| Table | Count | Status |
|---|---|---|
| `insider_trades` | ~784+ | **WORKING** – grows daily |
| `insiders` | ~372+ | **WORKING** |
| `congress_trades` | 0 | **EMPTY** – FMP paid tier required |
| `politicians` | 0 | **EMPTY** – depends on congress_trades |
| `stock_prices` | varies | **WORKING** – enriched for insider_trades tickers |
| `ticker_activity_summary` | ~214 | **WORKING** |
| `politician_summary` | 0 | **EMPTY** – depends on congress_trades |
| `superinvestors` | 84 | **WORKING** – seeded manually |
| `portfolio_holdings` | ~5,258 | **WORKING** – SEC EDGAR 13F via edgartools |
| `superinvestor_consensus` | 390 tickers | **WORKING** – materialized view |
| `superinvestor_latest_holdings` | 5,148 rows | **WORKING** – materialized view |

### Critical implementation notes (hard-won fixes)

- **edgartools v5 API**: use `form4.to_dataframe()` — not `form4.transactions` (removed in v5)
- **Form 4 dedup_key** includes: `cik + accession_no + insider_name + ticker + trade_date + shares + trade_type`
- **Group filings**: multiple CIKs share one `accession_no` — skip duplicates in scraper with `seen_accessions` set
- **pandas NaN**: must convert `float('nan')` → `None` before JSON/DB insert
- **Intra-batch dedup**: deduplicate by `dedup_key` in loader before batching; use `ignore_duplicates=True` on upsert
- **`refresh_materialized_views()`**: RPC function exists in DB (migration 003) — do not use `exec_sql`
- **edgartools param**: `get_filings(form="4", filing_date="YYYY-MM-DD")` — not `date=`
- **13F DataFrame columns are capitalized**: `Ticker`, `Issuer`, `Cusip`, `SharesPrnAmount`, `Value` — not lowercase
- **13F dedup_key**: uses CUSIP as primary identifier (always present); falls back to ticker, then company_name
- **13F `shares`/`value_usd`**: edgartools returns floats (e.g. `669888.0`) — must cast to `int()` before BIGINT insert
- **13F MAX_FILINGS_PER_INVESTOR = 4**: caps quarters fetched per first run to avoid full history backfill
- **13F data is quarterly, 45 days delayed**: Q4 2025 filings arrive ~Feb 2026; checkpoint handles incremental updates
- **stock_prices gap for 13F tickers**: `enrich_prices` only runs for tickers in `insider_trades`; superinvestor-only tickers (e.g. MSFT, GOOGL) won't have prices until a separate enrichment step is added

---

## Data source status

| Source | Status | Notes |
|---|---|---|
| SEC Form 4 (insider trades) | **WORKING** | edgartools `get_filings(form="4", filing_date=...)` |
| SEC 13F-HR (superinvestor holdings) | **WORKING** | edgartools `Company(cik).get_filings(form="13F-HR")` |
| Congressional trades (House) | **PENDING** | FMP paid tier required — scraper is written and correct, do not remove |
| Congressional trades (Senate) | **PENDING** | FMP paid tier required — scraper is written and correct, do not remove |

> **Congress scraper note:** `apps/pipeline/scrapers/congress.py` is correctly
> implemented using the Financial Modeling Prep (FMP) API (`FMP_API_KEY`).
> The code is ready — it only needs a paid FMP subscription to return data.
> Do NOT remove or disable this scraper.

---

## Pipeline conventions

### Incremental processing
Every job reads its last successful run time from `pipeline_state`
via `core/checkpoint.py`. It fetches only data newer than that
timestamp minus a 48-hour overlap window (to catch delayed or
corrected filings). `set_checkpoint()` is only called on success.

### Deduplication
Every row gets a deterministic MD5 hash (from `core/dedup.py`)
based on stable, immutable fields – never based on source IDs
that may change. This hash is stored as `dedup_key` and used
as the upsert conflict key.

### Validation
All incoming data passes through Pydantic models in
`core/validator.py` before touching the database. A row that
fails validation is logged as a warning and skipped – it never
crashes the job.

### Rate limits (never exceed these)
| Source | Limit | Constant |
|---|---|---|
| SEC EDGAR | 9 req/s | `SEC_LIMITER` |
| Finnhub | 30 req/s | `FINNHUB_LIMITER` |
| yfinance | 0.5 req/s | `YFINANCE_LIMITER` |

### Stock price fetching
Always batch price lookups – never fetch one ticker at a time.
Check `stock_prices` table first. Only fetch what is missing.
Try yfinance first, then Finnhub as fallback. If both fail,
log a warning and continue – never crash the job.

### Error handling pattern
Every job follows this structure:
1. Get checkpoint
2. Fetch and validate data
3. Load to database in batches of 100
4. Set checkpoint (only on success)
5. Write to `pipeline_runs` (success or failure)
6. On critical failure: write to `pipeline_runs`, send Telegram
   alert via `monitor/alerts.py`, exit with code 1

A single bad row must never stop the rest of the job.

### Daily job sequence (GitHub Actions, 08:00 UTC)
```
fetch_congress → fetch_form4 → enrich_prices → refresh_aggregates → fetch_13f
```
Each job waits for the previous to succeed (`needs:` in workflow).
`fetch_13f` runs last — it is the slowest and least time-sensitive.

---

## Frontend conventions

- Dark theme by default
- Colors: background #0f1117, buy = green (#22c55e), sell = red (#ef4444)
- Democrat = blue (#3b82f6), Republican = red (#ef4444), Independent = grey
- All formatting goes through `lib/formatters.ts`:
  - `formatAmountRange(min, max)` → "$1K–$15K"
  - `formatDate(dateStr)` → "Jan 15, 2026"
  - `formatTicker(ticker)` → "NVDA" or "–" if null
- Use shadcn/ui components for all UI elements
- All pages are server components with `export const revalidate = 60`
- URL params reflect filter state (filters are shareable via URL)
- Always show loading skeleton, empty state, and error state
- Mobile-first: test at 375px width

---

## What NOT to do

- Do not use [SITE NAME] placeholders – the site name is DataHeimdall (dataheimdall.com)
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Do not fetch stock prices one by one – always batch
- Do not skip `dedup_key` when inserting rows
- Do not crash a pipeline job because one row is invalid
- Do not use `WidthType.PERCENTAGE` in tables (use fixed px)
- Do not add new npm packages without checking bundle impact
- Do not commit `.env.local` or any file containing secrets
- Do not bypass the rate limiters when calling external APIs

---

## Phase roadmap

| Phase | Status | Contents |
|---|---|---|
| 1 | In progress | Congressional trades + insider trades |
| 2 | **Done** | Super investor tracking (13F filings) |
| 3 | Planned | Portfolio copier tool |
| Future | Planned | Auth (Supabase Auth) + payments (Stripe) |

Phase 2 is complete: `superinvestors` and `portfolio_holdings` are populated,
`superinvestor_consensus` and `superinvestor_latest_holdings` materialized views
are live, all API endpoints and frontend pages are built.

---

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend + pipeline | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Pipeline only | Never expose client-side |
| `EDGAR_IDENTITY` | Pipeline | Name + email for SEC identification |
| `FINNHUB_API_KEY` | Pipeline | Free tier API key |
| `OPENFIGI_API_KEY` | Pipeline | Free tier API key |
| `TELEGRAM_BOT_TOKEN` | Pipeline | For failure alerts |
| `TELEGRAM_CHAT_ID` | Pipeline | For failure alerts |
| `FMP_API_KEY` | Pipeline | Financial Modeling Prep – for congress trades (paid tier) |
| `NEXT_PUBLIC_GA_ID` | Frontend | Google Analytics – set at launch |

---

*Keep this file updated as the project evolves.*
## Future enhancements (do not implement yet)

- **52-week high/low**: `stock_prices` currently only stores `close_price`.
  Adding 52-week high/low requires fetching yfinance fields `"52WeekHigh"` and
  `"52WeekLow"` (available via `yf.Ticker(t).fast_info`). Requires a schema
  migration to add `high_52w` and `low_52w` columns to `stock_prices`.

---

*Last updated: 2026-04-05 – Phase 2 superinvestors complete (13F pipeline, API, frontend)*
