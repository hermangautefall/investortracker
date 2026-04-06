import { getAdminClient } from '@/lib/supabase-admin'

export const revalidate = 0

const PIPELINE_JOBS = ['fetch_congress', 'fetch_form4', 'enrich_prices', 'refresh_aggregates'] as const
const STALE_THRESHOLD_MS = 26 * 60 * 60 * 1000 // 26 hours

export async function GET() {
  const supabase = getAdminClient()

  let database: 'connected' | 'error' = 'connected'
  let insiderCount = 0
  let congressCount = 0
  let stockPricesCount = 0
  let holdingsCount = 0

  try {
    const [it, ct, sp, ph] = await Promise.all([
      supabase.from('insider_trades').select('id', { count: 'exact', head: true }),
      supabase.from('congress_trades').select('id', { count: 'exact', head: true }),
      supabase.from('stock_prices').select('ticker', { count: 'exact', head: true }),
      supabase.from('portfolio_holdings').select('id', { count: 'exact', head: true }),
    ])
    if (it.error || ct.error || sp.error || ph.error) database = 'error'
    insiderCount     = it.count ?? 0
    congressCount    = ct.count ?? 0
    stockPricesCount = sp.count ?? 0
    holdingsCount    = ph.count ?? 0
  } catch {
    database = 'error'
  }

  // Backfill stats — min/max quarter for portfolio_holdings, date range for insider_trades
  let earliestQuarter: string | null = null
  let latestQuarter: string | null = null
  let earliestInsiderDate: string | null = null
  let latestInsiderDate: string | null = null

  try {
    const [phMin, phMax, itMin, itMax] = await Promise.all([
      supabase.from('portfolio_holdings').select('quarter').order('quarter', { ascending: true }).limit(1),
      supabase.from('portfolio_holdings').select('quarter').order('quarter', { ascending: false }).limit(1),
      supabase.from('insider_trades').select('trade_date').order('trade_date', { ascending: true }).limit(1),
      supabase.from('insider_trades').select('trade_date').order('trade_date', { ascending: false }).limit(1),
    ])
    earliestQuarter    = phMin.data?.[0]?.quarter ?? null
    latestQuarter      = phMax.data?.[0]?.quarter ?? null
    earliestInsiderDate = itMin.data?.[0]?.trade_date ?? null
    latestInsiderDate   = itMax.data?.[0]?.trade_date ?? null
  } catch {
    // Non-critical — backfill stats are informational only
  }

  // Fetch latest run per job
  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('job_name, status, rows_inserted, ran_at')
    .order('ran_at', { ascending: false })
    .limit(40)

  type PipelineJob = {
    last_run: string | null
    status: string | null
    rows_inserted: number | null
  }

  const pipeline: Record<string, PipelineJob> = Object.fromEntries(
    PIPELINE_JOBS.map((job) => [job, { last_run: null, status: null, rows_inserted: null }])
  )

  for (const run of runs ?? []) {
    const key = run.job_name as string
    if (key in pipeline && pipeline[key].last_run === null) {
      pipeline[key] = {
        last_run: run.ran_at as string,
        status: run.status as string,
        rows_inserted: (run.rows_inserted as number | null) ?? null,
      }
    }
  }

  const now = Date.now()
  const anyStale = Object.values(pipeline).some(
    (j) => !j.last_run || now - new Date(j.last_run).getTime() > STALE_THRESHOLD_MS
  )

  const status = database === 'error' || anyStale ? 'degraded' : 'ok'

  return Response.json({
    status,
    database,
    data: {
      insider_trades: insiderCount,
      congress_trades: congressCount,
      stock_prices: stockPricesCount,
    },
    backfill: {
      superinvestors_13f: {
        total_holdings: holdingsCount,
        earliest_quarter: earliestQuarter,
        latest_quarter: latestQuarter,
      },
      insider_trades: {
        total_trades: insiderCount,
        earliest_date: earliestInsiderDate,
        latest_date: latestInsiderDate,
      },
    },
    pipeline,
  })
}
