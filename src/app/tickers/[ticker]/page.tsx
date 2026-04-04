import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { TradeBadge } from '@/components/badges/TradeBadge'
import { PartyBadge } from '@/components/badges/PartyBadge'
import { formatDate, formatValue, formatShares, formatAmountRange } from '@/lib/formatters'
import { ExternalLink, ChevronLeft } from 'lucide-react'

export const revalidate = 60

const LOOKBACK_DAYS = 90

type InsiderTrade = {
  id: string
  ticker: string | null
  company_name: string | null
  trade_type: string | null
  shares: number | null
  total_value: number | null
  trade_date: string | null
  form4_url: string | null
  insiders: { id: string; name: string | null } | null
}

type CongressTrade = {
  id: string
  ticker: string | null
  company_name: string | null
  trade_type: string | null
  amount_min: number | null
  amount_max: number | null
  trade_date: string | null
  disclosure_date: string | null
  filing_url: string | null
  politicians: { id: string; full_name: string | null; party: string | null; state: string | null } | null
}

type SummaryRow = {
  trade_count: number | null
  total_volume: number | null
  buy_count: number | null
  sell_count: number | null
  last_trade: string | null
}

function SummaryCard({
  title,
  summary,
  empty,
}: {
  title: string
  summary: SummaryRow | null
  empty: string
}) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-6">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">{title}</h3>
        <p className="text-sm text-white/30">{empty}</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-6">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-white">{summary.trade_count ?? 0}</p>
          <p className="text-xs text-white/40">Total trades</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{formatValue(summary.total_volume)}</p>
          <p className="text-xs text-white/40">Volume</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-green-400">{summary.buy_count ?? 0}</p>
          <p className="text-xs text-white/40">Buys</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-400">{summary.sell_count ?? 0}</p>
          <p className="text-xs text-white/40">Sells</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/30">Last trade: {formatDate(summary.last_trade)}</p>
    </div>
  )
}

export default async function TickerActivityPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker: rawTicker } = await params
  const ticker = rawTicker.toUpperCase()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const supabase = getAdminClient()
  const [summaryRes, congressRes, insiderRes] = await Promise.all([
    supabase
      .from('ticker_activity_summary')
      .select('data_type, trade_count, total_volume, buy_count, sell_count, last_trade')
      .eq('ticker', ticker),
    supabase
      .from('congress_trades')
      .select(
        `id, ticker, company_name, trade_type, amount_min, amount_max,
         trade_date, disclosure_date, filing_url,
         politicians(id, full_name, party, state)`
      )
      .eq('ticker', ticker)
      .gte('trade_date', cutoffStr)
      .order('trade_date', { ascending: false }),
    supabase
      .from('insider_trades')
      .select(
        `id, ticker, company_name, trade_type, shares,
         total_value, trade_date, form4_url,
         insiders(id, name)`
      )
      .eq('ticker', ticker)
      .gte('trade_date', cutoffStr)
      .order('trade_date', { ascending: false }),
  ])

  const summaryRows = summaryRes.data ?? []
  const congressSummary =
    (summaryRows.find((r) => r.data_type === 'congress') as SummaryRow | undefined) ?? null
  const insiderSummary =
    (summaryRows.find((r) => r.data_type === 'insider') as SummaryRow | undefined) ?? null

  const congressTrades = (congressRes.data ?? []) as unknown as CongressTrade[]
  const insiderTrades = (insiderRes.data ?? []) as unknown as InsiderTrade[]

  // Try to get company name from either dataset
  const companyName =
    insiderTrades[0]?.company_name ?? congressTrades[0]?.company_name ?? null

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        href="/insiders"
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Insider Trades
      </Link>

      {/* Ticker header */}
      <div className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-white">{ticker}</h1>
        {companyName && <p className="mt-1 text-white/50">{companyName}</p>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <SummaryCard
          title="Congressional Activity"
          summary={congressSummary}
          empty="No data yet"
        />
        <SummaryCard
          title="Insider Activity"
          summary={insiderSummary}
          empty="No insider trades in the last 90 days"
        />
      </div>

      {/* Trade tables — stacked on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Congressional trades */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">
            Congressional Trades
            <span className="ml-2 text-xs text-white/30 font-normal">last 90 days</span>
          </h2>
          {congressTrades.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/3 p-8 text-center">
              <p className="text-sm text-white/30">
                Congressional trade data is being sourced and will appear here shortly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Politician</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Type</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {congressTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-3 py-2.5 text-white/60 whitespace-nowrap">
                        {formatDate(trade.trade_date)}
                      </td>
                      <td className="px-3 py-2.5">
                        {trade.politicians ? (
                          <Link
                            href={`/politicians/${trade.politicians.id}`}
                            className="flex items-center gap-2 hover:text-white/70 transition-colors"
                          >
                            <PartyBadge party={trade.politicians.party} />
                            <span className="text-white text-xs">
                              {trade.politicians.full_name}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-white/40">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <TradeBadge type={trade.trade_type} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-white/60 text-xs tabular-nums">
                        {formatAmountRange(trade.amount_min, trade.amount_max)}
                        {trade.filing_url && (
                          <a
                            href={trade.filing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1.5 inline-flex text-white/25 hover:text-white/60 transition-colors"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Insider trades */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">
            Insider Trades
            <span className="ml-2 text-xs text-white/30 font-normal">last 90 days</span>
          </h2>
          {insiderTrades.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/3 p-8 text-center">
              <p className="text-sm text-white/30">No insider trades in the last 90 days.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Insider</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Type</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {insiderTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-3 py-2.5 text-white/60 whitespace-nowrap">
                        {formatDate(trade.trade_date)}
                      </td>
                      <td className="px-3 py-2.5">
                        {trade.insiders ? (
                          <Link
                            href={`/insiders/${trade.insiders.id}`}
                            className="text-white hover:text-white/70 transition-colors text-xs"
                          >
                            {trade.insiders.name ?? '–'}
                          </Link>
                        ) : (
                          <span className="text-white/40">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <TradeBadge type={trade.trade_type} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-white tabular-nums">
                        {formatValue(trade.total_value)}
                        {trade.form4_url && (
                          <a
                            href={trade.form4_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1.5 inline-flex text-white/25 hover:text-white/60 transition-colors"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
