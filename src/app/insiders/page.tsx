import Link from 'next/link'
import { Suspense } from 'react'
import { getAdminClient } from '@/lib/supabase-admin'
import { TradeBadge } from '@/components/badges/TradeBadge'
import { formatDate, formatValue, formatShares } from '@/lib/formatters'
import { InsidersFilters } from './InsidersFilters'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

export const revalidate = 60

const PAGE_SIZE = 50

type InsiderTrade = {
  id: string
  ticker: string | null
  company_name: string | null
  trade_type: string | null
  shares: number | null
  total_value: number | null
  trade_date: string | null
  filing_date: string | null
  form4_url: string | null
  insiders: { id: string; name: string | null; cik: string | null } | null
}

// ─── Cluster strip ────────────────────────────────────────────────────────────

async function getClusters() {
  const supabase = getAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const { data } = await supabase
    .from('insider_trades')
    .select('ticker, insider_id, trade_type')
    .gte('trade_date', cutoff.toISOString().slice(0, 10))
    .not('ticker', 'is', null)

  if (!data || data.length === 0) return []

  const map = new Map<string, { insiders: Set<string>; buys: number; sells: number }>()
  for (const row of data) {
    const ticker = row.ticker as string
    if (!map.has(ticker)) map.set(ticker, { insiders: new Set(), buys: 0, sells: 0 })
    const entry = map.get(ticker)!
    if (row.insider_id) entry.insiders.add(row.insider_id as string)
    const t = ((row.trade_type as string) ?? '').toLowerCase()
    if (t === 'buy') entry.buys++
    else if (t === 'sell') entry.sells++
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.insiders.size >= 3)
    .map(([ticker, v]) => ({ ticker, count: v.insiders.size, buyDominant: v.buys >= v.sells }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getTrades(opts: {
  type: string
  minValue: string
  days: string
  q: string
  page: number
}) {
  const supabase = getAdminClient()
  const { type, minValue, days, q, page } = opts
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let insiderIds: string[] = []
  if (q) {
    const { data: found } = await supabase
      .from('insiders')
      .select('id')
      .ilike('name', `%${q}%`)
      .limit(100)
    insiderIds = found?.map((r) => r.id) ?? []
  }

  let query = supabase
    .from('insider_trades')
    .select(
      `id, ticker, company_name, trade_type, shares,
       total_value, trade_date, filing_date, form4_url,
       insiders(id, name, cik)`,
      { count: 'exact' }
    )
    .order('trade_date', { ascending: false })
    .range(from, to)

  if (type) query = query.eq('trade_type', type)
  if (minValue) {
    query = query.gte('total_value', parseFloat(minValue)).not('total_value', 'is', null)
  }
  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(days, 10))
    query = query.gte('trade_date', cutoff.toISOString().slice(0, 10))
  }
  if (q) {
    const safeQ = q.replace(/'/g, "''")
    if (insiderIds.length > 0) {
      query = query.or(`ticker.ilike.%${safeQ}%,insider_id.in.(${insiderIds.join(',')})`)
    } else {
      query = query.ilike('ticker', `%${safeQ}%`)
    }
  }

  return query
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InsidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const type = typeof sp.type === 'string' ? sp.type : ''
  const minValue = typeof sp.min_value === 'string' ? sp.min_value : ''
  const days = typeof sp.days === 'string' ? sp.days : '30'
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : ''
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10))

  const [{ data, count, error }, clusters] = await Promise.all([
    getTrades({ type, minValue, days, q, page }),
    getClusters(),
  ])

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const trades = (data ?? []) as unknown as InsiderTrade[]

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (minValue) params.set('min_value', minValue)
    if (days !== '30') params.set('days', days)
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/insiders${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Insider Trades</h1>

      {/* Cluster strip */}
      {clusters.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/40 font-medium mr-1">Hot this week:</span>
          {clusters.map((c) => (
            <Link
              key={c.ticker}
              href={`/tickers/${c.ticker}`}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity ${
                c.buyDominant
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'bg-red-500/15 text-red-400 border border-red-500/20'
              }`}
            >
              {c.ticker}
              <span className="opacity-70">({c.count})</span>
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <Suspense>
          <InsidersFilters
            currentType={type}
            currentMinValue={minValue}
            currentDays={days}
            currentQ={q}
            lastUpdated={new Date().toISOString()}
          />
        </Suspense>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Unable to load data. Please refresh the page.
        </div>
      )}

      {/* Empty */}
      {!error && trades.length === 0 && (
        <div className="rounded-lg border border-white/8 bg-white/3 p-16 text-center">
          <p className="text-white/40 text-sm">No trades found for the selected filters.</p>
        </div>
      )}

      {/* Table */}
      {!error && trades.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  {['Date', 'Insider', 'Stock', 'Type', 'Shares', 'Value', 'Src'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide ${
                        i >= 4 ? 'text-right' : 'text-left'
                      } ${h === 'Src' ? 'text-center w-10' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {formatDate(trade.trade_date)}
                    </td>
                    <td className="px-4 py-3">
                      {trade.insiders ? (
                        <Link
                          href={`/insiders/${trade.insiders.id}`}
                          className="text-white hover:text-white/70 transition-colors font-medium"
                        >
                          {trade.insiders.name ?? '–'}
                        </Link>
                      ) : (
                        <span className="text-white/40">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tickers/${trade.ticker}`} className="group flex flex-col">
                        <span className="font-mono font-bold text-white group-hover:text-white/70 transition-colors">
                          {trade.ticker?.toUpperCase() ?? '–'}
                        </span>
                        {trade.company_name && (
                          <span className="text-xs text-white/40 truncate max-w-[160px]">
                            {trade.company_name}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TradeBadge type={trade.trade_type} />
                    </td>
                    <td className="px-4 py-3 text-right text-white/60 tabular-nums">
                      {formatShares(trade.shares)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white tabular-nums">
                      {formatValue(trade.total_value)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {trade.form4_url && (
                        <a
                          href={trade.form4_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-white/30 hover:text-white/70 transition-colors"
                          title="View SEC filing"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                >
                  <ChevronLeft size={14} /> Previous
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/5 text-sm text-white/20 cursor-not-allowed">
                  <ChevronLeft size={14} /> Previous
                </span>
              )}
              <span className="text-sm text-white/40">
                Page {page} of {totalPages}{' '}
                <span className="text-white/20">
                  ({total.toLocaleString('en-US')} total)
                </span>
              </span>
              {page < totalPages ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                >
                  Next <ChevronRight size={14} />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/5 text-sm text-white/20 cursor-not-allowed">
                  Next <ChevronRight size={14} />
                </span>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
