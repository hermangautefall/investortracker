import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { ActivityCard } from '@/components/marketing/ActivityCard'
import { SuperinvestorTable } from './SuperinvestorTable'
import type { InvestorRow } from './SuperinvestorTable'
import type { MostOwnedRow, BiggestRow, ActivityRow } from '@/lib/homepage-data'

export const revalidate = 300

// ─── formatQuarter still exported (used by profile page) ──────────────────────
export function formatQuarter(q: string | null): string {
  if (!q) return '–'
  const m = q.match(/^(\d{4})Q(\d)$/)
  if (!m) return q
  return `Q${m[2]} ${m[1]}`
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

type PageData = {
  investorRows: InvestorRow[]
  mostOwned: MostOwnedRow[]
  biggest: BiggestRow[]
  activity: {
    buys_1q: ActivityRow[]
    sells_1q: ActivityRow[]
    buys_2q: ActivityRow[]
    sells_2q: ActivityRow[]
  }
}

type HoldingRaw = {
  investor_id: string | null
  ticker: string | null
  company_name: string | null
  value_usd: number | null
  quarter: string | null
  filing_date: string | null
}

async function getPageData(): Promise<PageData> {
  const supabase = getAdminClient()

  const [investorsRes, holdingsRes, consensusRes] = await Promise.all([
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
  ])

  const investors = investorsRes.data ?? []
  const holdings = (holdingsRes.data ?? []) as unknown as HoldingRaw[]

  // ── Per-investor summary ──────────────────────────────────────────────────
  type InvSummary = {
    latestQ: string
    latestFiling: string | null
    aumByQ: Map<string, number>
    tickersByQ: Map<string, Set<string>>
  }
  const invSummary = new Map<string, InvSummary>()

  // ── Per-ticker aggregation for cards ─────────────────────────────────────
  const holdingMap = new Map<string, Map<string, Set<string>>>()
  const holdingCompany = new Map<string, string | null>()

  for (const h of holdings) {
    const inv = h.investor_id
    const q = h.quarter
    if (!inv || !q) continue

    // Per-investor
    if (!invSummary.has(inv)) {
      invSummary.set(inv, { latestQ: q, latestFiling: null, aumByQ: new Map(), tickersByQ: new Map() })
    }
    const s = invSummary.get(inv)!
    if (q > s.latestQ) s.latestQ = q
    if (h.filing_date && (!s.latestFiling || h.filing_date > s.latestFiling)) {
      s.latestFiling = h.filing_date
    }
    s.aumByQ.set(q, (s.aumByQ.get(q) ?? 0) + (h.value_usd ?? 0))
    if (!s.tickersByQ.has(q)) s.tickersByQ.set(q, new Set())
    if (h.ticker) s.tickersByQ.get(q)!.add(h.ticker)

    // Per-ticker for cards
    if (h.ticker) {
      if (!holdingMap.has(h.ticker)) holdingMap.set(h.ticker, new Map())
      const qMap = holdingMap.get(h.ticker)!
      if (!qMap.has(q)) qMap.set(q, new Set())
      qMap.get(q)!.add(inv)
      if (h.company_name && !holdingCompany.has(h.ticker)) holdingCompany.set(h.ticker, h.company_name)
    }
  }

  // Investor rows for table
  const investorRows: InvestorRow[] = investors.map((si) => {
    const s = invSummary.get(si.id)
    if (!s) {
      return { id: si.id, name: si.name, fund_name: si.fund_name, holdings_count: 0, total_aum_usd: 0, latest_quarter: null, latest_filing_date: null }
    }
    const q = s.latestQ
    return {
      id: si.id,
      name: si.name,
      fund_name: si.fund_name,
      holdings_count: s.tickersByQ.get(q)?.size ?? 0,
      total_aum_usd: s.aumByQ.get(q) ?? 0,
      latest_quarter: q,
      latest_filing_date: s.latestFiling,
    }
  })

  // Most owned (consensus view)
  const mostOwned: MostOwnedRow[] = (consensusRes.data ?? [])
    .filter((r): r is { ticker: string; company_name: string | null; investor_count: number } => r.ticker != null)
    .map((r) => ({ ticker: r.ticker, company_name: r.company_name, investor_count: r.investor_count }))

  // Biggest investments (latest global quarter)
  const latestGlobalQ = Array.from(
    new Set(holdings.map((h) => h.quarter).filter((q): q is string => q != null))
  ).sort().reverse()[0] ?? null

  let biggest: BiggestRow[] = []
  if (latestGlobalQ) {
    const biggestMap = new Map<string, { company_name: string | null; total: number }>()
    for (const h of holdings) {
      if (h.quarter !== latestGlobalQ || !h.ticker) continue
      if (!biggestMap.has(h.ticker)) biggestMap.set(h.ticker, { company_name: null, total: 0 })
      const e = biggestMap.get(h.ticker)!
      if (h.company_name) e.company_name = h.company_name
      e.total += h.value_usd ?? 0
    }
    biggest = Array.from(biggestMap.entries())
      .map(([ticker, e]) => ({ ticker, company_name: e.company_name, total_value: e.total }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)
  }

  // Activity (buys/sells by quarter comparison)
  const allQuarters = Array.from(
    new Set(holdings.map((h) => h.quarter).filter((q): q is string => q != null))
  ).sort().reverse()
  const [Q0, Q1, Q2] = allQuarters

  function getInvestorSet(ticker: string, q: string | undefined): Set<string> {
    if (!q) return new Set()
    return holdingMap.get(ticker)?.get(q) ?? new Set()
  }

  const allSITickers = Array.from(holdingMap.keys())

  function computeActivity(getter: (ticker: string) => number): ActivityRow[] {
    return allSITickers
      .map((ticker) => ({ ticker, company_name: holdingCompany.get(ticker) ?? null, count: getter(ticker) }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const activity = {
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

  return { investorRows, mostOwned, biggest, activity }
}

// ─── Small shared card components ─────────────────────────────────────────────

function formatValuePlus(v: number): string {
  if (!v || v <= 0) return '–'
  if (v >= 1_000_000_000) {
    const b = v / 1_000_000_000
    return `$${b >= 10 ? Math.round(b) : b.toFixed(1)}B+`
  }
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M+`
  return `$${Math.round(v / 1_000)}K+`
}

function CardShell({
  title,
  seeMoreHref,
  children,
}: {
  title: string
  seeMoreHref: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 flex flex-col overflow-hidden">
      <div className="px-4 pt-3.5 pb-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{title}</span>
        <Link href={seeMoreHref} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
          see more →
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function TickerRows({
  rows,
  valueLabel,
  valueFormatter,
  valueColor,
}: {
  rows: { ticker: string; company_name: string | null; value: string | number }[]
  valueLabel: string
  valueFormatter?: (v: number) => string
  valueColor?: string
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-white/5">
          <th className="px-3 py-1.5 text-left font-medium text-white/30">Ticker</th>
          <th className="px-3 py-1.5 text-left font-medium text-white/30 hidden sm:table-cell">Name</th>
          <th className="px-3 py-1.5 text-right font-medium text-white/30">{valueLabel}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/4">
        {rows.map((row, i) => (
          <tr key={`${row.ticker}-${i}`} className="hover:bg-white/3 transition-colors">
            <td className="px-3 py-1.5">
              <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors">
                {row.ticker}
              </Link>
            </td>
            <td className="px-3 py-1.5 text-white/40 truncate max-w-[100px] hidden sm:table-cell">
              {row.company_name ?? '–'}
            </td>
            <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${valueColor ?? 'text-white/70'}`}>
              {typeof row.value === 'number' && valueFormatter ? valueFormatter(row.value) : row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SuperInvestorsPage() {
  const { investorRows, mostOwned, biggest, activity } = await getPageData()

  const siActivityDatasets = [
    [activity.buys_1q, activity.buys_2q],
    [activity.sells_1q, activity.sells_2q],
  ] as const

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Superinvestors</h1>
        <p className="mt-1 text-sm text-white/50">
          List of value investing gurus – portfolios sourced from SEC 13F filings
        </p>
      </div>

      {/* Two-column layout: table left, cards right */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: sortable table (60%) */}
        <div className="w-full lg:w-[60%] shrink-0">
          {investorRows.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/3 p-16 text-center">
              <p className="text-white/40 text-sm">No investor data yet.</p>
            </div>
          ) : (
            <SuperinvestorTable investors={investorRows} />
          )}
        </div>

        {/* Right: three stacked cards (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4">
          {/* Card 1: Most owned */}
          <CardShell title="Top 10 Most Owned" seeMoreHref="/grand-portfolio?source=superinvestors">
            {mostOwned.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-white/25">No data yet</div>
            ) : (
              <TickerRows
                rows={mostOwned.map((r: MostOwnedRow) => ({ ticker: r.ticker, company_name: r.company_name, value: r.investor_count }))}
                valueLabel="Gurus"
                valueColor="text-violet-400"
              />
            )}
          </CardShell>

          {/* Card 2: Buys / Sells activity toggle */}
          <ActivityCard
            title="Top 10"
            opt1Labels={['Buys', 'Sells']}
            opt2Labels={['Last Qtr', 'Last 2 Qtrs']}
            datasets={siActivityDatasets}
            countLabel="Gurus"
            isBuyFirst={true}
            seeMoreHref="/grand-portfolio?source=superinvestors"
          />

          {/* Card 3: Biggest investments */}
          <CardShell title="Top 10 Biggest Investments" seeMoreHref="/superinvestors">
            {biggest.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-white/25">No data yet</div>
            ) : (
              <TickerRows
                rows={biggest.map((r: BiggestRow) => ({ ticker: r.ticker, company_name: r.company_name, value: r.total_value }))}
                valueLabel="Value"
                valueFormatter={formatValuePlus}
                valueColor="text-white/70"
              />
            )}
          </CardShell>
        </div>
      </div>
    </main>
  )
}
