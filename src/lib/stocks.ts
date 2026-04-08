import { cache } from 'react'
import { getAdminClient } from './supabase-admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StockPricePoint = {
  date: string
  close_price: number | null
}

export type SuperinvestorHolder = {
  investor_id: string
  investor_name: string | null
  fund_name: string | null
  shares: number | null
  value_usd: number | null
  portfolio_weight: number | null
  quarter: string | null
  activity: 'new' | 'added' | 'reduced' | 'held' | null
}

export type InsiderTradeRow = {
  id: string
  trade_date: string
  trade_type: string | null
  shares: number | null
  price_per_share: number | null
  total_value: number | null
  form4_url: string | null
  insider_id: string | null
  insider_name: string | null
  insider_role: string | null
  cluster: boolean
}

export type CongressTradeRow = {
  id: string
  trade_date: string
  disclosure_date: string
  trade_type: string | null
  amount_min: number | null
  amount_max: number | null
  filing_url: string | null
  politician_id: string | null
  politician_name: string | null
  party: string | null
  state: string | null
  chamber: string | null
}

export type StockPageData = {
  ticker: string
  companyName: string | null
  prices: StockPricePoint[]
  superinvestorHolders: SuperinvestorHolder[]
  insiderTrades: InsiderTradeRow[]
  congressTrades: CongressTradeRow[]
}

export type StockIndexRow = {
  ticker: string
  company_name: string | null
  investor_count: number | null
  total_value_usd: number | null
  insider_buy_count: number | null
  insider_sell_count: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect cluster buys: 3+ open-market purchases (code P) within 7 calendar days */
function detectClusterBuys(trades: InsiderTradeRow[]): Set<string> {
  const purchases = trades
    .filter((t) => t.trade_type === 'P')
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date))

  const clusterIds = new Set<string>()

  for (let i = 0; i < purchases.length; i++) {
    const windowStart = new Date(purchases[i].trade_date + 'T12:00:00Z')
    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 7)

    const inWindow: string[] = []
    for (let j = i; j < purchases.length; j++) {
      if (new Date(purchases[j].trade_date + 'T12:00:00Z') > windowEnd) break
      inWindow.push(purchases[j].id)
    }

    if (inWindow.length >= 3) {
      for (const id of inWindow) clusterIds.add(id)
    }
  }

  return clusterIds
}

/** Determine quarter-over-quarter activity for an investor's position */
function getActivity(
  currentShares: number | null,
  prevShares: number | null,
): SuperinvestorHolder['activity'] {
  if (prevShares === null) return 'new'
  if (currentShares === null) return null
  // Treat < 0.5% change as "held" to avoid noise from rounding
  if (currentShares > prevShares * 1.005) return 'added'
  if (currentShares < prevShares * 0.995) return 'reduced'
  return 'held'
}

// ---------------------------------------------------------------------------
// Data fetching (React cache — deduplicates within one request/render)
// ---------------------------------------------------------------------------

/** All tickers that have insider-trade or superinvestor data (for sitemap / static params) */
export const getAllStockTickers = cache(async (): Promise<string[]> => {
  const supabase = getAdminClient()
  const [insiderRes, siRes] = await Promise.all([
    supabase
      .from('ticker_activity_summary')
      .select('ticker')
      .eq('data_type', 'insider'),
    supabase.from('superinvestor_consensus').select('ticker'),
  ])
  const map: Record<string, true> = {}
  for (const r of insiderRes.data ?? []) if (r.ticker) map[r.ticker] = true
  for (const r of siRes.data ?? []) if (r.ticker) map[r.ticker] = true
  return Object.keys(map).sort()
})

/** Full data for a single ticker page */
export const getStockPageData = cache(async (ticker: string): Promise<StockPageData> => {
  const supabase = getAdminClient()
  const upper = ticker.toUpperCase()

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [priceRes, siRes, prevRes, tradeRes, congressRes] = await Promise.all([
    // Last 2 closing prices → 1-day change
    supabase
      .from('stock_prices')
      .select('date, close_price')
      .eq('ticker', upper)
      .order('date', { ascending: false })
      .limit(2),

    // Current-quarter superinvestor holders
    supabase
      .from('superinvestor_latest_holdings')
      .select('investor_id, investor_name, fund_name, shares, value_usd, portfolio_weight, quarter, company_name')
      .eq('ticker', upper)
      .order('portfolio_weight', { ascending: false }),

    // All quarters for activity (added/reduced/held) detection
    supabase
      .from('portfolio_holdings')
      .select('investor_id, shares, quarter')
      .eq('ticker', upper)
      .not('investor_id', 'is', null)
      .order('quarter', { ascending: false }),

    // Insider trades: open-market buys (P) and sells (S) in the last 12 months
    supabase
      .from('insider_trades')
      .select('id, trade_date, trade_type, shares, price_per_share, total_value, form4_url, insider_id, company_name, insiders(name, primary_role)')
      .eq('ticker', upper)
      .in('trade_type', ['P', 'S'])
      .gte('trade_date', cutoffStr)
      .order('trade_date', { ascending: false }),

    // Congressional trades in the last 12 months
    supabase
      .from('congress_trades')
      .select('id, trade_date, disclosure_date, trade_type, amount_min, amount_max, filing_url, politicians(id, full_name, party, state, chamber)')
      .eq('ticker', upper)
      .gte('trade_date', cutoffStr)
      .order('trade_date', { ascending: false }),
  ])

  // Build prev-quarter shares map for activity detection.
  // prevRes is sorted by quarter DESC, so the first occurrence per investor
  // is the latest quarter (already in latest_holdings); the second is "prev".
  const seenLatest = new Set<string>()
  const prevSharesMap = new Map<string, number | null>()
  for (const h of prevRes.data ?? []) {
    if (!h.investor_id) continue
    if (!seenLatest.has(h.investor_id)) {
      seenLatest.add(h.investor_id)
    } else if (!prevSharesMap.has(h.investor_id)) {
      prevSharesMap.set(h.investor_id, h.shares)
    }
  }

  const holders: SuperinvestorHolder[] = (siRes.data ?? []).map((h) => ({
    investor_id: h.investor_id ?? '',
    investor_name: h.investor_name,
    fund_name: h.fund_name,
    shares: h.shares,
    value_usd: h.value_usd,
    portfolio_weight: h.portfolio_weight,
    quarter: h.quarter,
    activity: getActivity(
      h.shares,
      h.investor_id ? (prevSharesMap.get(h.investor_id) ?? null) : null,
    ),
  }))

  // Build insider trade rows
  const rawTrades: InsiderTradeRow[] = (tradeRes.data ?? []).map((t) => {
    const ins = t.insiders as { name: string | null; primary_role: string | null } | null
    return {
      id: t.id,
      trade_date: t.trade_date,
      trade_type: t.trade_type,
      shares: t.shares,
      price_per_share: t.price_per_share,
      total_value: t.total_value,
      form4_url: t.form4_url,
      insider_id: t.insider_id,
      insider_name: ins?.name ?? null,
      insider_role: ins?.primary_role ?? null,
      cluster: false,
    }
  })

  const clusterIds = detectClusterBuys(rawTrades)
  const insiderTrades = rawTrades.map((t) => ({ ...t, cluster: clusterIds.has(t.id) }))

  const congressTrades: CongressTradeRow[] = (congressRes.data ?? []).map((t) => {
    const pol = t.politicians as {
      id: string
      full_name: string | null
      party: string | null
      state: string | null
      chamber: string | null
    } | null
    return {
      id: t.id,
      trade_date: t.trade_date,
      disclosure_date: t.disclosure_date,
      trade_type: t.trade_type,
      amount_min: t.amount_min,
      amount_max: t.amount_max,
      filing_url: t.filing_url,
      politician_id: pol?.id ?? null,
      politician_name: pol?.full_name ?? null,
      party: pol?.party ?? null,
      state: pol?.state ?? null,
      chamber: pol?.chamber ?? null,
    }
  })

  // Company name: prefer superinvestor view (tends to be cleaner)
  const companyName =
    siRes.data?.[0]?.company_name ??
    (tradeRes.data?.[0] as unknown as { company_name?: string } | undefined)
      ?.company_name ??
    null

  return {
    ticker: upper,
    companyName,
    prices: priceRes.data ?? [],
    superinvestorHolders: holders,
    insiderTrades,
    congressTrades,
  }
})

/** Aggregated list for the /stocks index page */
export const getStocksIndex = cache(async (): Promise<StockIndexRow[]> => {
  const supabase = getAdminClient()
  const [consensusRes, activityRes] = await Promise.all([
    supabase
      .from('superinvestor_consensus')
      .select('ticker, company_name, investor_count, total_value_usd')
      .not('ticker', 'is', null)
      .order('investor_count', { ascending: false }),
    supabase
      .from('ticker_activity_summary')
      .select('ticker, buy_count, sell_count')
      .eq('data_type', 'insider'),
  ])

  const activityMap = new Map<string, { buy_count: number | null; sell_count: number | null }>()
  for (const r of activityRes.data ?? []) {
    if (r.ticker) activityMap.set(r.ticker, { buy_count: r.buy_count, sell_count: r.sell_count })
  }

  return (consensusRes.data ?? [])
    .filter((r): r is typeof r & { ticker: string } => r.ticker != null)
    .map((r) => {
      const a = activityMap.get(r.ticker) ?? { buy_count: null, sell_count: null }
      return {
        ticker: r.ticker,
        company_name: r.company_name,
        investor_count: r.investor_count,
        total_value_usd: r.total_value_usd,
        insider_buy_count: a.buy_count,
        insider_sell_count: a.sell_count,
      }
    })
})
