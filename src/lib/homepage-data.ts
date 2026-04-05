import { getAdminClient } from './supabase-admin'

// ─── Shared types ─────────────────────────────────────────────────────────────

export type HomepageStats = {
  insider_count: number
  superinvestor_count: number
}

export type SuperinvestorTop10Row = {
  id: string
  name: string
  fund_name: string | null
  total_aum_usd: number
  holdings_count: number
  latest_filing_date: string | null
  latest_quarter: string | null
}

export type MostOwnedRow = {
  ticker: string
  company_name: string | null
  investor_count: number
}

export type BiggestRow = {
  ticker: string
  company_name: string | null
  total_value: number
}

export type ActivityRow = {
  ticker: string
  company_name: string | null
  count: number
}

export type SuperinvestorActivity = {
  buys_1q: ActivityRow[]
  sells_1q: ActivityRow[]
  buys_2q: ActivityRow[]
  sells_2q: ActivityRow[]
}

export type MostActiveInsiderRow = {
  id: string
  name: string | null
  primary_company: string | null
  trade_count: number
}

export type InsiderActivity = {
  buys_30d: ActivityRow[]
  sells_30d: ActivityRow[]
  buys_90d: ActivityRow[]
  sells_90d: ActivityRow[]
}

export type HomepageData = {
  stats: HomepageStats
  superinvestors_top10: SuperinvestorTop10Row[]
  superinvestor_most_owned: MostOwnedRow[]
  superinvestor_biggest: BiggestRow[]
  superinvestor_activity: SuperinvestorActivity
  insider_most_active: MostActiveInsiderRow[]
  insider_activity: InsiderActivity
  insider_biggest: BiggestRow[]
}

// ─── Internal row types ───────────────────────────────────────────────────────

type HoldingRaw = {
  investor_id: string | null
  ticker: string | null
  company_name: string | null
  value_usd: number | null
  quarter: string | null
  filing_date: string | null
}

type TradeRaw = {
  insider_id: string | null
  ticker: string | null
  company_name: string | null
  trade_type: string | null
  total_value: number | null
  trade_date: string | null
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getHomepageData(): Promise<HomepageData> {
  const supabase = getAdminClient()

  const cutoff90Str = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
  const cutoff30Str = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)

  // Single parallel batch — 8 queries
  const [
    insiderCountRes,
    siCountRes,
    investorsRes,
    holdingsRes,
    consensusRes,
    insiderTradesRes,
    insidersRes,
  ] = await Promise.all([
    supabase.from('insider_trades').select('id', { count: 'exact', head: true }),
    supabase.from('superinvestors').select('id', { count: 'exact', head: true }),
    supabase.from('superinvestors').select('id, name, fund_name'),
    supabase
      .from('portfolio_holdings')
      .select('investor_id, ticker, company_name, value_usd, quarter, filing_date')
      .not('investor_id', 'is', null),
    supabase
      .from('superinvestor_consensus')
      .select('ticker, company_name, investor_count')
      .order('investor_count', { ascending: false })
      .limit(10),
    supabase
      .from('insider_trades')
      .select('insider_id, ticker, company_name, trade_type, total_value, trade_date')
      .not('ticker', 'is', null)
      .neq('ticker', '')
      .gte('trade_date', cutoff90Str),
    supabase.from('insiders').select('id, name, primary_company'),
  ])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats: HomepageStats = {
    insider_count: insiderCountRes.count ?? 0,
    superinvestor_count: siCountRes.count ?? 0,
  }

  // ── Process portfolio holdings ─────────────────────────────────────────────

  const holdings = (holdingsRes.data ?? []) as unknown as HoldingRaw[]

  // Per-investor aggregation
  const invSummary = new Map<
    string,
    { latestQ: string; latestFiling: string | null; aumByQ: Map<string, number>; tickersByQ: Map<string, Set<string>> }
  >()

  for (const h of holdings) {
    const inv = h.investor_id
    const q = h.quarter
    if (!inv || !q) continue
    if (!invSummary.has(inv)) {
      invSummary.set(inv, { latestQ: q, latestFiling: null, aumByQ: new Map(), tickersByQ: new Map() })
    }
    const s = invSummary.get(inv)!
    if (q > s.latestQ) {
      s.latestQ = q
      s.latestFiling = h.filing_date ?? null
    }
    if (q === s.latestQ && h.filing_date && (!s.latestFiling || h.filing_date > s.latestFiling)) {
      s.latestFiling = h.filing_date
    }
    s.aumByQ.set(q, (s.aumByQ.get(q) ?? 0) + (h.value_usd ?? 0))
    if (!s.tickersByQ.has(q)) s.tickersByQ.set(q, new Set())
    if (h.ticker) s.tickersByQ.get(q)!.add(h.ticker)
  }

  // ── Superinvestors Top 10 (recently updated) ───────────────────────────────

  const superinvestors_top10: SuperinvestorTop10Row[] = (investorsRes.data ?? [])
    .flatMap((si) => {
      const s = invSummary.get(si.id)
      if (!s) return []
      const q = s.latestQ
      const row: SuperinvestorTop10Row = {
        id: si.id,
        name: si.name,
        fund_name: si.fund_name ?? null,
        total_aum_usd: s.aumByQ.get(q) ?? 0,
        holdings_count: s.tickersByQ.get(q)?.size ?? 0,
        latest_filing_date: s.latestFiling,
        latest_quarter: q,
      }
      return [row]
    })
    .sort((a, b) => {
      const fd = (b.latest_filing_date ?? b.latest_quarter ?? '').localeCompare(
        a.latest_filing_date ?? a.latest_quarter ?? ''
      )
      return fd !== 0 ? fd : (b.latest_quarter ?? '').localeCompare(a.latest_quarter ?? '')
    })
    .slice(0, 10)

  // ── Most owned (from consensus view) ──────────────────────────────────────

  const superinvestor_most_owned: MostOwnedRow[] = (consensusRes.data ?? [])
    .filter((r): r is { ticker: string; company_name: string | null; investor_count: number } => r.ticker != null)
    .map((r) => ({ ticker: r.ticker, company_name: r.company_name, investor_count: r.investor_count }))

  // ── Biggest investments (latest quarter, grouped by ticker) ───────────────

  const latestGlobalQ = Array.from(
    new Set(holdings.map((h) => h.quarter).filter((q): q is string => q != null))
  )
    .sort()
    .reverse()[0] ?? null

  let superinvestor_biggest: BiggestRow[] = []
  if (latestGlobalQ) {
    const biggestMap = new Map<string, { company_name: string | null; total: number }>()
    for (const h of holdings) {
      if (h.quarter !== latestGlobalQ || !h.ticker) continue
      const t = h.ticker
      if (!biggestMap.has(t)) biggestMap.set(t, { company_name: null, total: 0 })
      const e = biggestMap.get(t)!
      if (h.company_name) e.company_name = h.company_name
      e.total += h.value_usd ?? 0
    }
    superinvestor_biggest = Array.from(biggestMap.entries())
      .map(([ticker, e]) => ({ ticker, company_name: e.company_name, total_value: e.total }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)
  }

  // ── Superinvestor Activity (buys/sells by quarter comparison) ─────────────

  const allQuarters = Array.from(new Set(holdings.map((h) => h.quarter).filter((q): q is string => q != null)))
    .sort()
    .reverse()
  const [Q0, Q1, Q2] = allQuarters

  // ticker -> quarter -> Set<investor_id>
  const holdingMap = new Map<string, Map<string, Set<string>>>()
  const holdingCompany = new Map<string, string | null>()

  for (const h of holdings) {
    const ticker = h.ticker
    const q = h.quarter
    const investor = h.investor_id
    if (!ticker || !q || !investor) continue
    if (!holdingMap.has(ticker)) holdingMap.set(ticker, new Map())
    const qMap = holdingMap.get(ticker)!
    if (!qMap.has(q)) qMap.set(q, new Set())
    qMap.get(q)!.add(investor)
    if (h.company_name && !holdingCompany.has(ticker)) holdingCompany.set(ticker, h.company_name)
  }

  function getInvestorSet(ticker: string, q: string | undefined): Set<string> {
    if (!q) return new Set()
    return holdingMap.get(ticker)?.get(q) ?? new Set()
  }

  const allSITickers = Array.from(holdingMap.keys())

  function computeActivity(
    getter: (ticker: string) => number
  ): ActivityRow[] {
    return allSITickers
      .map((ticker) => ({
        ticker,
        company_name: holdingCompany.get(ticker) ?? null,
        count: getter(ticker),
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const superinvestor_activity: SuperinvestorActivity = {
    buys_1q:
      Q0 && Q1
        ? computeActivity((t) => {
            const q0 = getInvestorSet(t, Q0)
            const q1 = getInvestorSet(t, Q1)
            return Array.from(q0).filter((i) => !q1.has(i)).length
          })
        : [],
    sells_1q:
      Q0 && Q1
        ? computeActivity((t) => {
            const q0 = getInvestorSet(t, Q0)
            const q1 = getInvestorSet(t, Q1)
            return Array.from(q1).filter((i) => !q0.has(i)).length
          })
        : [],
    buys_2q:
      Q0 && Q1 && Q2
        ? computeActivity((t) => {
            const q0 = getInvestorSet(t, Q0)
            const q1 = getInvestorSet(t, Q1)
            const q2 = getInvestorSet(t, Q2)
            const recent = new Set([...Array.from(q0), ...Array.from(q1)])
            return Array.from(recent).filter((i) => !q2.has(i)).length
          })
        : [],
    sells_2q:
      Q0 && Q1 && Q2
        ? computeActivity((t) => {
            const q0 = getInvestorSet(t, Q0)
            const q1 = getInvestorSet(t, Q1)
            const q2 = getInvestorSet(t, Q2)
            const recent = new Set([...Array.from(q0), ...Array.from(q1)])
            return Array.from(q2).filter((i) => !recent.has(i)).length
          })
        : [],
  }

  // ── Process insider trades ─────────────────────────────────────────────────

  const trades = (insiderTradesRes.data ?? []) as unknown as TradeRaw[]

  // Most active insiders (last 90 days, by trade count)
  const insiderTradeCount = new Map<string, number>()
  for (const t of trades) {
    if (!t.insider_id) continue
    insiderTradeCount.set(t.insider_id, (insiderTradeCount.get(t.insider_id) ?? 0) + 1)
  }

  const topInsiderIds = Array.from(insiderTradeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  const insidersById = new Map(
    (insidersRes.data ?? []).map((i) => [i.id, i])
  )

  const insider_most_active: MostActiveInsiderRow[] = topInsiderIds
    .map((id) => {
      const insider = insidersById.get(id)
      return {
        id,
        name: insider?.name ?? null,
        primary_company: (insider as { primary_company?: string | null })?.primary_company ?? null,
        trade_count: insiderTradeCount.get(id) ?? 0,
      }
    })
    .filter((r) => r.name !== null)

  // Insider activity by ticker (buys/sells, 30d/90d)
  function aggregateInsiderActivity(
    rows: TradeRaw[],
    tradeType: 'buy' | 'sell'
  ): ActivityRow[] {
    const map = new Map<string, { company_name: string | null; insiders: Set<string> }>()
    for (const r of rows) {
      if ((r.trade_type ?? '').toLowerCase() !== tradeType || !r.ticker) continue
      const ticker = r.ticker
      if (!map.has(ticker)) map.set(ticker, { company_name: null, insiders: new Set() })
      const e = map.get(ticker)!
      if (r.company_name) e.company_name = r.company_name
      if (r.insider_id) e.insiders.add(r.insider_id)
    }
    return Array.from(map.entries())
      .map(([ticker, e]) => ({ ticker, company_name: e.company_name, count: e.insiders.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const trades30d = trades.filter((r) => (r.trade_date ?? '') >= cutoff30Str)

  const insider_activity: InsiderActivity = {
    buys_30d: aggregateInsiderActivity(trades30d, 'buy'),
    sells_30d: aggregateInsiderActivity(trades30d, 'sell'),
    buys_90d: aggregateInsiderActivity(trades, 'buy'),
    sells_90d: aggregateInsiderActivity(trades, 'sell'),
  }

  // Biggest insider trades by total value (90d, buys only)
  const biggestInsiderMap = new Map<string, { company_name: string | null; total: number }>()
  for (const r of trades) {
    if (!r.ticker) continue
    const ticker = r.ticker
    if (!biggestInsiderMap.has(ticker)) biggestInsiderMap.set(ticker, { company_name: null, total: 0 })
    const e = biggestInsiderMap.get(ticker)!
    if (r.company_name) e.company_name = r.company_name
    e.total += r.total_value ?? 0
  }
  const insider_biggest: BiggestRow[] = Array.from(biggestInsiderMap.entries())
    .map(([ticker, e]) => ({ ticker, company_name: e.company_name, total_value: e.total }))
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 10)

  return {
    stats,
    superinvestors_top10,
    superinvestor_most_owned,
    superinvestor_biggest,
    superinvestor_activity,
    insider_most_active,
    insider_activity,
    insider_biggest,
  }
}
