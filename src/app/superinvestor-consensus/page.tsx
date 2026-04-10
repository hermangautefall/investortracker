import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatValue } from '@/lib/formatters'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatQuarter } from '../superinvestors/page'

export const revalidate = 300

const PAGE_SIZE = 50

type ConsensusRow = {
  ticker: string | null
  company_name: string | null
  investor_count: number
  total_value_usd: number | null
  avg_weight: number | null
  latest_quarter: string | null
  close_price: number | null
}

const MIN_INVESTOR_OPTIONS = [
  { label: 'All', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '5+', value: '5' },
  { label: '10+', value: '10' },
]

export default async function SuperInvestorConsensusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const minInvestors = Math.max(
    1,
    parseInt(typeof sp.min_investors === 'string' ? sp.min_investors : '1', 10)
  )
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = getAdminClient()
  const { data, count } = await supabase
    .from('superinvestor_consensus')
    .select(
      'ticker, company_name, investor_count, total_value_usd, avg_weight, latest_quarter',
      { count: 'exact' }
    )
    .gte('investor_count', minInvestors)
    .order('investor_count', { ascending: false })
    .range(from, to)

  const rows = (data ?? []) as ConsensusRow[]
  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Join latest stock prices
  const tickers = rows.map((r) => r.ticker).filter((t): t is string => t != null)
  const priceMap = new Map<string, number | null>()
  if (tickers.length > 0) {
    const { data: prices } = await supabase
      .from('stock_prices')
      .select('ticker, close_price, date')
      .in('ticker', tickers)
      .order('date', { ascending: false })
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ticker)) priceMap.set(p.ticker, p.close_price)
    }
  }

  const enriched: ConsensusRow[] = rows.map((r) => ({
    ...r,
    close_price: r.ticker ? (priceMap.get(r.ticker) ?? null) : null,
  }))

  function filterUrl(min: string, p = 1) {
    const params = new URLSearchParams()
    params.set('min_investors', min)
    if (p > 1) params.set('page', String(p))
    return `/superinvestor-consensus?${params.toString()}`
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    params.set('min_investors', String(minInvestors))
    if (p > 1) params.set('page', String(p))
    return `/superinvestor-consensus?${params.toString()}`
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Superinvestor Consensus</h1>
        <p className="mt-1 text-sm text-white/50">
          Stocks held by the most tracked legendary investors — latest 13F filings
        </p>
      </div>

      {/* Min investors filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-white/40">Min investors:</span>
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/3 p-0.5">
          {MIN_INVESTOR_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={filterUrl(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                String(minInvestors) === opt.value
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <span className="text-xs text-white/30 ml-2">{total} stocks</span>
      </div>

      {enriched.length === 0 ? (
        <div className="card-glow rounded-xl bg-white/[0.03] p-16 text-center">
          <p className="text-white/40 text-sm">No data for the selected filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto card-glow rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.04]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide w-8">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                    Company
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">
                    Investors
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden md:table-cell">
                    Avg Weight
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden md:table-cell">
                    Total Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                    Quarter
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {enriched.map((row, idx) => (
                  <tr key={row.ticker ?? idx} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 text-white/30 text-xs">
                      {from + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      {row.ticker ? (
                        <Link
                          href={`/tickers/${row.ticker}`}
                          className="font-mono font-bold text-white hover:text-white/70 transition-colors"
                        >
                          {row.ticker}
                        </Link>
                      ) : (
                        <span className="text-white/30">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs truncate max-w-[200px] hidden sm:table-cell">
                      {row.company_name ?? '–'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white tabular-nums text-sm">
                        {row.investor_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/60 tabular-nums text-xs hidden md:table-cell">
                      {row.avg_weight != null ? `${Number(row.avg_weight).toFixed(1)}%` : '–'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white tabular-nums text-xs hidden md:table-cell">
                      {formatValue(row.total_value_usd)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/60 font-mono tabular-nums text-xs">
                      {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                    </td>
                    <td className="px-4 py-3 text-right text-white/30 text-xs hidden sm:table-cell">
                      {formatQuarter(row.latest_quarter)}
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
                Page {page} of {totalPages}
                <span className="text-white/20 ml-2">({total.toLocaleString('en-US')} stocks)</span>
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
