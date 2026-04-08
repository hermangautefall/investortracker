import Link from 'next/link'
import { getStocksIndex } from '@/lib/stocks'
import { formatValue } from '@/lib/formatters'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Stock Tracker — Insider Trades & Superinvestor Holdings | DataHeimdall',
  description:
    'Browse stocks by superinvestor ownership count. See insider trades and 13F institutional holdings for every tracked ticker.',
  alternates: { canonical: 'https://dataheimdall.com/stocks' },
}

export default async function StocksIndexPage() {
  const stocks = await getStocksIndex()

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Stock Tracker</h1>
      <p className="text-sm text-white/40 mb-10">
        {stocks.length} tickers tracked · sorted by superinvestor ownership
      </p>

      {stocks.length === 0 ? (
        <p className="text-white/40 text-sm">No data yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40 w-6 tabular-nums">#</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Ticker</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Company</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Superinvestors</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden md:table-cell">Inst. Value</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden sm:table-cell">Insider Buys</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden sm:table-cell">Insider Sells</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stocks.map((s, i) => (
                <tr key={s.ticker} className="hover:bg-white/3 transition-colors">
                  <td className="px-3 py-2.5 text-white/25 text-xs tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/stocks/${s.ticker}`}
                      className="font-mono font-semibold text-violet-400 hover:text-violet-300 transition-colors text-sm"
                    >
                      {s.ticker}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-white/50 text-xs hidden sm:table-cell max-w-[200px] truncate">
                    {s.company_name ?? '–'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                    {s.investor_count != null && s.investor_count > 0 ? (
                      <span className="text-violet-300 font-semibold">{s.investor_count}</span>
                    ) : (
                      <span className="text-white/25">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/50 tabular-nums text-xs hidden md:table-cell">
                    {formatValue(s.total_value_usd)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs hidden sm:table-cell">
                    {s.insider_buy_count != null && s.insider_buy_count > 0 ? (
                      <span className="text-green-400">{s.insider_buy_count}</span>
                    ) : (
                      <span className="text-white/25">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs hidden sm:table-cell">
                    {s.insider_sell_count != null && s.insider_sell_count > 0 ? (
                      <span className="text-red-400">{s.insider_sell_count}</span>
                    ) : (
                      <span className="text-white/25">–</span>
                    )}
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
