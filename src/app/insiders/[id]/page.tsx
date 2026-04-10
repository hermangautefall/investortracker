import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { TradeBadge } from '@/components/badges/TradeBadge'
import { formatDate, formatValue, formatShares } from '@/lib/formatters'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = (await import('@/lib/supabase-admin')).getAdminClient()
  const { data } = await supabase.from('insiders').select('name').eq('id', id).maybeSingle()
  const name = data?.name ?? 'Insider'
  return {
    title: `${name} – Insider Trading Activity`,
    description: `SEC Form 4 trading history for ${name}. View all reported insider trades and activity.`,
    alternates: { canonical: `https://dataheimdall.com/insiders/${id}` },
  }
}

const PAGE_SIZE = 50

type Trade = {
  id: string
  ticker: string | null
  company_name: string | null
  trade_type: string | null
  shares: number | null
  total_value: number | null
  trade_date: string | null
  form4_url: string | null
}

type InsiderProfile = {
  id: string
  name: string | null
  cik: string | null
  primary_role: string | null
  primary_company: string | null
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-white/40">{label}</p>
    </div>
  )
}

export default async function InsiderProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = getAdminClient()
  const [insiderRes, tradesRes] = await Promise.all([
    supabase.from('insiders').select('id, name, cik, primary_role, primary_company').eq('id', id).maybeSingle(),
    supabase
      .from('insider_trades')
      .select(
        'id, ticker, company_name, trade_type, shares, total_value, trade_date, form4_url',
        { count: 'exact' }
      )
      .eq('insider_id', id)
      .order('trade_date', { ascending: false })
      .range(from, to),
  ])

  if (!insiderRes.data) notFound()
  const insider = insiderRes.data as unknown as InsiderProfile
  const trades = (tradesRes.data ?? []) as Trade[]
  const total = tradesRes.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buys = trades.filter((t) => t.trade_type?.toLowerCase() === 'buy').length
  const sells = trades.filter((t) => t.trade_type?.toLowerCase() === 'sell').length
  const lastTrade = trades[0]?.trade_date

  function pageUrl(p: number) {
    return p > 1 ? `/insiders/${id}?page=${p}` : `/insiders/${id}`
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/insiders"
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Insider Trades
      </Link>

      {/* Profile header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{insider.name ?? 'Unknown Insider'}</h1>
        {insider.primary_role && (
          <p className="mt-1 text-sm text-white/60">
            {insider.primary_role}
            {insider.primary_company && ` at ${insider.primary_company}`}
          </p>
        )}
        {insider.cik && (
          <p className="mt-1 text-xs text-white/30">CIK: {insider.cik}</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total trades" value={total.toLocaleString('en-US')} />
        <StatCard label="Buys" value={buys.toLocaleString('en-US')} />
        <StatCard label="Sells" value={sells.toLocaleString('en-US')} />
        <StatCard label="Last trade" value={formatDate(lastTrade ?? null)} />
      </div>

      {/* Trades table */}
      {trades.length === 0 ? (
        <div className="rounded-xl card-glow bg-white/[0.03] p-16 text-center">
          <p className="text-white/40 text-sm">No trade history found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto card-glow rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.04]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Type</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">Shares</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">Value</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/40 uppercase tracking-wide w-10">Src</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {formatDate(trade.trade_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tickers/${trade.ticker}`} className="group flex flex-col">
                        <span className="font-mono font-bold text-white group-hover:text-white/70 transition-colors">
                          {trade.ticker?.toUpperCase() ?? '–'}
                        </span>
                        {trade.company_name && (
                          <span className="text-xs text-white/40 truncate max-w-[180px]">
                            {trade.company_name}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TradeBadge type={trade.trade_type} />
                    </td>
                    <td className="px-4 py-3 text-right text-white/60 tabular-nums hidden sm:table-cell">
                      {formatShares(trade.shares)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white tabular-nums hidden sm:table-cell">
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
