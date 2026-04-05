import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatValue } from '@/lib/formatters'

export const revalidate = 300

type Investor = {
  id: string
  name: string
  fund_name: string | null
  cik: string | null
  holdings_count: number
  total_aum_usd: number
  latest_quarter: string | null
}

export function formatQuarter(q: string | null): string {
  if (!q) return '–'
  const m = q.match(/^(\d{4})Q(\d)$/)
  if (!m) return q
  return `Q${m[2]} ${m[1]}`
}

async function getInvestors(): Promise<Investor[]> {
  const supabase = getAdminClient()
  const [investorsRes, holdingsRes] = await Promise.all([
    supabase.from('superinvestors').select('id, name, fund_name, cik'),
    supabase.from('portfolio_holdings').select('investor_id, ticker, value_usd, quarter'),
  ])
  if (!investorsRes.data) return []

  const summaryMap = new Map<
    string,
    { tickers: Set<string>; aum: number; quarter: string | null }
  >()
  for (const h of holdingsRes.data ?? []) {
    if (!h.investor_id) continue
    if (!summaryMap.has(h.investor_id))
      summaryMap.set(h.investor_id, { tickers: new Set(), aum: 0, quarter: null })
    const s = summaryMap.get(h.investor_id)!
    if (h.ticker) s.tickers.add(h.ticker)
    s.aum += h.value_usd ?? 0
    if (!s.quarter || (h.quarter && h.quarter > s.quarter)) s.quarter = h.quarter
  }

  return investorsRes.data
    .map((si) => {
      const s = summaryMap.get(si.id)
      return {
        id: si.id,
        name: si.name,
        fund_name: si.fund_name,
        cik: si.cik,
        holdings_count: s ? s.tickers.size : 0,
        total_aum_usd: s ? s.aum : 0,
        latest_quarter: s?.quarter ?? null,
      }
    })
    .sort((a, b) => b.total_aum_usd - a.total_aum_usd)
}

export default async function SuperInvestorsPage() {
  const investors = await getInvestors()

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Super Investors</h1>
        <p className="mt-1 text-sm text-white/50">
          Portfolios of legendary value investors — sourced from SEC 13F filings
        </p>
      </div>

      {investors.length === 0 ? (
        <div className="rounded-lg border border-white/8 bg-white/3 p-16 text-center">
          <p className="text-white/40 text-sm">No investor data yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">
                  Investor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                  Fund
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">
                  Holdings
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">
                  AUM
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                  Latest
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {investors.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/superinvestors/${inv.id}`}
                      className="font-medium text-white hover:text-white/70 transition-colors"
                    >
                      {inv.name}
                    </Link>
                    {inv.fund_name && (
                      <p className="text-xs text-white/40 mt-0.5 sm:hidden">{inv.fund_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs hidden sm:table-cell">
                    {inv.fund_name ?? '–'}
                  </td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">
                    {inv.holdings_count > 0 ? inv.holdings_count : '–'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white tabular-nums">
                    {inv.total_aum_usd > 0 ? formatValue(inv.total_aum_usd) : '–'}
                  </td>
                  <td className="px-4 py-3 text-right text-white/40 text-xs hidden sm:table-cell">
                    {formatQuarter(inv.latest_quarter)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
