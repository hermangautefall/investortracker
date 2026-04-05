import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatValue, formatShares } from '@/lib/formatters'
import { ChevronLeft } from 'lucide-react'
import { formatQuarter } from '../page'

export const revalidate = 300

type Holding = {
  ticker: string | null
  company_name: string | null
  shares: number | null
  value_usd: number | null
  portfolio_weight: number | null
  quarter: string | null
}

type Investor = {
  id: string
  name: string
  fund_name: string | null
  cik: string | null
}

// Compare two sets of holdings; return enriched rows with change badge
type ChangedHolding = Holding & { change: 'new' | 'sold' | 'increased' | 'decreased'; changePct: number | null }

function compareQuarters(
  current: Holding[],
  previous: Holding[],
  mode: 'buys' | 'sells'
): ChangedHolding[] {
  const prevMap = new Map<string, number>()
  for (const h of previous) {
    if (h.ticker) prevMap.set(h.ticker, h.portfolio_weight ?? 0)
  }

  const result: ChangedHolding[] = []
  const currentTickers = new Set(current.map((h) => h.ticker).filter(Boolean) as string[])

  if (mode === 'buys') {
    for (const h of current) {
      if (!h.ticker) continue
      if (!prevMap.has(h.ticker)) {
        result.push({ ...h, change: 'new', changePct: null })
      } else {
        const prev = prevMap.get(h.ticker)!
        const cur = h.portfolio_weight ?? 0
        if (cur > prev + 0.01) {
          result.push({ ...h, change: 'increased', changePct: Math.round((cur - prev) * 10) / 10 })
        }
      }
    }
  } else {
    // sells: eliminated or reduced
    for (const h of previous) {
      if (!h.ticker) continue
      if (!currentTickers.has(h.ticker)) {
        result.push({ ...h, change: 'sold', changePct: null })
      }
    }
    for (const h of current) {
      if (!h.ticker) continue
      if (prevMap.has(h.ticker)) {
        const prev = prevMap.get(h.ticker)!
        const cur = h.portfolio_weight ?? 0
        if (cur < prev - 0.01) {
          result.push({ ...h, change: 'decreased', changePct: Math.round((prev - cur) * 10) / 10 })
        }
      }
    }
  }

  return result.sort((a, b) => (b.portfolio_weight ?? 0) - (a.portfolio_weight ?? 0))
}

function ChangeBadge({ change, pct }: { change: ChangedHolding['change']; pct: number | null }) {
  if (change === 'new')
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
        NEW
      </span>
    )
  if (change === 'sold')
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
        SOLD
      </span>
    )
  if (change === 'increased')
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-green-400">
        ▲ +{pct}%
      </span>
    )
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-400">
      ▼ -{pct}%
    </span>
  )
}

export default async function SuperInvestorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const rawTab = typeof sp.tab === 'string' ? sp.tab : 'holdings'
  const tab: 'holdings' | 'buys' | 'sells' = ['buys', 'sells'].includes(rawTab)
    ? (rawTab as 'buys' | 'sells')
    : 'holdings'

  const supabase = getAdminClient()

  // Fetch investor profile
  const investorRes = await supabase
    .from('superinvestors')
    .select('id, name, fund_name, cik')
    .eq('id', id)
    .maybeSingle()

  if (!investorRes.data) notFound()
  const investor = investorRes.data as Investor

  // Fetch all holdings to derive available quarters
  const allHoldingsRes = await supabase
    .from('portfolio_holdings')
    .select('quarter')
    .eq('investor_id', id)

  const quartersSet = new Set(
    (allHoldingsRes.data ?? []).map((h) => h.quarter).filter((q): q is string => q != null)
  )
  const quarters = Array.from(quartersSet).sort().reverse()
  const latestQuarter = quarters[0] ?? null

  const rawQ = typeof sp.quarter === 'string' ? sp.quarter : null
  const selectedQuarter = rawQ && quartersSet.has(rawQ) ? rawQ : latestQuarter

  // Fetch holdings for selected quarter (and previous for tabs)
  const prevQuarter = selectedQuarter ? quarters[quarters.indexOf(selectedQuarter) + 1] ?? null : null

  const [currentRes, prevRes] = await Promise.all([
    selectedQuarter
      ? supabase
          .from('portfolio_holdings')
          .select('ticker, company_name, shares, value_usd, portfolio_weight, quarter')
          .eq('investor_id', id)
          .eq('quarter', selectedQuarter)
          .not('ticker', 'is', null)
          .order('portfolio_weight', { ascending: false })
      : Promise.resolve({ data: [] }),
    prevQuarter && tab !== 'holdings'
      ? supabase
          .from('portfolio_holdings')
          .select('ticker, company_name, shares, value_usd, portfolio_weight, quarter')
          .eq('investor_id', id)
          .eq('quarter', prevQuarter)
          .not('ticker', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const currentHoldings = (currentRes.data ?? []) as Holding[]
  const prevHoldings = (prevRes.data ?? []) as Holding[]

  const maxWeight = Math.max(...currentHoldings.map((h) => h.portfolio_weight ?? 0), 0.01)

  function tabUrl(t: string) {
    const p = new URLSearchParams()
    p.set('tab', t)
    if (selectedQuarter) p.set('quarter', selectedQuarter)
    return `/superinvestors/${id}?${p.toString()}`
  }

  function quarterUrl(q: string) {
    const p = new URLSearchParams()
    p.set('tab', tab)
    p.set('quarter', q)
    return `/superinvestors/${id}?${p.toString()}`
  }

  const displayRows: (Holding | ChangedHolding)[] =
    tab === 'holdings'
      ? currentHoldings
      : compareQuarters(currentHoldings, prevHoldings, tab as 'buys' | 'sells')

  const TABS = [
    { key: 'holdings', label: 'Holdings' },
    { key: 'buys', label: 'Qtr Buys' },
    { key: 'sells', label: 'Qtr Sells' },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        href="/superinvestors"
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Super Investors
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{investor.name}</h1>
        <p className="mt-1 text-sm text-white/50">
          {investor.fund_name && <span>{investor.fund_name}</span>}
          {investor.fund_name && investor.cik && <span className="mx-2 text-white/20">·</span>}
          {investor.cik && <span>CIK: {investor.cik}</span>}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">{currentHoldings.length}</p>
          <p className="mt-1 text-xs text-white/40">Positions</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">
            {formatValue(currentHoldings.reduce((s, h) => s + (h.value_usd ?? 0), 0))}
          </p>
          <p className="mt-1 text-xs text-white/40">AUM</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">{quarters.length}</p>
          <p className="mt-1 text-xs text-white/40">Quarters tracked</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">
            {formatQuarter(latestQuarter)}
          </p>
          <p className="mt-1 text-xs text-white/40">Latest filing</p>
        </div>
      </div>

      {/* Tab strip + quarter picker */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/3 p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabUrl(t.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Quarter picker */}
        {quarters.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">Quarter:</span>
            <select
              value={selectedQuarter ?? ''}
              onChange={() => {}} // handled via links below
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white/70 cursor-pointer focus:outline-none hidden"
            />
            {/* Render as links since this is a server component */}
            <div className="flex items-center gap-1">
              {quarters.map((q) => (
                <Link
                  key={q}
                  href={quarterUrl(q)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    q === selectedQuarter
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {formatQuarter(q)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No holdings */}
      {displayRows.length === 0 ? (
        <div className="rounded-lg border border-white/8 bg-white/3 p-12 text-center">
          <p className="text-white/40 text-sm">
            {tab === 'buys'
              ? prevQuarter
                ? 'No new or increased positions this quarter.'
                : 'No previous quarter available for comparison.'
              : tab === 'sells'
              ? prevQuarter
                ? 'No reduced or eliminated positions this quarter.'
                : 'No previous quarter available for comparison.'
              : 'No holdings data for this quarter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 hidden sm:table-cell">
                  Company
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Weight</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden md:table-cell">
                  Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Value</th>
                {tab !== 'holdings' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 w-20">
                    Change
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayRows.map((h, idx) => {
                const changed = 'change' in h ? h : null
                return (
                  <tr key={`${h.ticker}-${idx}`} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-white/30 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      {h.ticker ? (
                        <Link
                          href={`/tickers/${h.ticker}`}
                          className="font-mono font-bold text-white hover:text-white/70 transition-colors"
                        >
                          {h.ticker}
                        </Link>
                      ) : (
                        <span className="text-white/30">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs truncate max-w-[180px] hidden sm:table-cell">
                      {h.company_name ?? '–'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tab === 'holdings' && h.portfolio_weight != null && (
                          <div className="hidden sm:block w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-white/25"
                              style={{ width: `${Math.round((h.portfolio_weight / maxWeight) * 100)}%` }}
                            />
                          </div>
                        )}
                        <span className="text-white tabular-nums text-xs font-medium">
                          {h.portfolio_weight != null ? `${h.portfolio_weight.toFixed(2)}%` : '–'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white/50 tabular-nums text-xs hidden md:table-cell">
                      {formatShares(h.shares)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white tabular-nums text-xs">
                      {formatValue(h.value_usd)}
                    </td>
                    {tab !== 'holdings' && (
                      <td className="px-4 py-3">
                        {changed && (
                          <ChangeBadge change={changed.change} pct={changed.changePct} />
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
