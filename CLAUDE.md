# Project Context for Claude Code

## What this project is

A financial transparency platform that tracks congressional
stock trades (STOCK Act disclosures) and insider trades
(SEC Form 4 filings). Data is sourced from free public APIs
and presented in a clean, searchable interface.

> **Working title: "InvestorTracker"** – the final brand name
> has not been decided. Do NOT use "InvestorTracker" in any
> user-facing text, page titles, meta tags, UI copy, or email
> content. Use the placeholder [SITE NAME] everywhere instead,
> so it can be replaced globally once the name is decided.

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
│   ├── superinvestors/            Phase 2 – not yet built
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
| `superinvestors` | Phase 2 – defined, not yet populated |
| `portfolio_holdings` | Phase 2 – defined, not yet populated |

### Materialized views (refreshed daily)

| View | Purpose |
|---|---|
| `ticker_activity_summary` | Trade counts and volume per ticker |
| `politician_summary` | Trade stats per politician |

### Key column conventions
- Every insertable table has a `dedup_key TEXT UNIQUE NOT NULL`
- Every row stores original source data in `raw JSONB`
- Every row identifies its origin in `source TEXT`
- Timestamps use `TIMESTAMPTZ`, dates use `DATE`

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

---

## Data source status

| Source | Status | Notes |
|---|---|---|
| SEC Form 4 (insider trades) | **WORKING** | edgartools `get_filings(form="4", filing_date=...)` |
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
fetch_congress → fetch_form4 → enrich_prices → refresh_aggregates
```
Each job waits for the previous to succeed (`needs:` in workflow).

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

- Do not use "InvestorTracker" in user-facing text – use [SITE NAME]
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
| 2 | Planned | Super investor tracking (13F filings) |
| 3 | Planned | Portfolio copier tool |
| Future | Planned | Auth (Supabase Auth) + payments (Stripe) |

Phase 2 tables (`superinvestors`, `portfolio_holdings`) are
already defined in the database schema – they just aren't
populated yet. Do not delete or modify them.

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
*Last updated: 2026-04-04*
