import Link from 'next/link'
import { getHomepageData } from '@/lib/homepage-data'
import { NetworkAnimation } from '@/components/marketing/NetworkAnimation'
import { ActivityCard } from '@/components/marketing/ActivityCard'
import type {
  SuperinvestorTop10Row,
  MostOwnedRow,
  BiggestRow,
  MostActiveInsiderRow,
  ActivityRow,
} from '@/lib/homepage-data'

export const revalidate = 300

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatValuePlus(v: number): string {
  if (!v || v <= 0) return '–'
  if (v >= 1_000_000_000) {
    const b = v / 1_000_000_000
    return `$${b >= 10 ? Math.round(b) : b.toFixed(1)}B+`
  }
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M+`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K+`
  return `$${v.toLocaleString('en-US')}`
}

function formatFilingDate(dateStr: string | null): string {
  if (!dateStr) return '–'
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// ─── Static card components (server-rendered) ─────────────────────────────────

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
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{title}</span>
        <Link
          href={seeMoreHref}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          see more →
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function EmptyCardRow() {
  return (
    <div className="px-4 py-8 text-center text-xs text-white/25">No data yet</div>
  )
}

// Ticker-based card rows
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
          <th className="px-4 py-2 text-left font-medium text-white/30">Ticker</th>
          <th className="px-4 py-2 text-left font-medium text-white/30 hidden sm:table-cell">Name</th>
          <th className="px-4 py-2 text-right font-medium text-white/30">{valueLabel}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/4">
        {rows.map((row, i) => (
          <tr key={`${row.ticker}-${i}`} className="hover:bg-white/3 transition-colors">
            <td className="px-4 py-2">
              <Link
                href={`/tickers/${row.ticker}`}
                className="font-mono font-bold text-white hover:text-white/70 transition-colors"
              >
                {row.ticker}
              </Link>
            </td>
            <td className="px-4 py-2 text-white/40 truncate max-w-[120px] hidden sm:table-cell">
              {row.company_name ?? '–'}
            </td>
            <td className={`px-4 py-2 text-right font-semibold tabular-nums ${valueColor ?? 'text-white/70'}`}>
              {typeof row.value === 'number' && valueFormatter ? valueFormatter(row.value) : row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionHeader({
  title,
  subtitle,
  seeAllHref,
}: {
  title: string
  subtitle: string
  seeAllHref?: string
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-white/40">{subtitle}</p>
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="text-sm text-white/40 hover:text-white/70 transition-colors mb-0.5"
        >
          See all →
        </Link>
      )}
    </div>
  )
}

function SeeAllButton({ href, label = 'See all superinvestors' }: { href: string; label?: string }) {
  return (
    <div className="flex justify-center mt-6">
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors"
      >
        {label}
      </Link>
    </div>
  )
}

function Divider({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-6 py-4">
      <div className="flex-1 h-px bg-white/8" />
      <div className="text-center shrink-0">
        <div className="text-xl font-bold text-white">{title}</div>
        <div className="text-xs text-white/40 mt-0.5">{subtitle}</div>
      </div>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const data = await getHomepageData()

  const {
    stats,
    superinvestors_top10,
    superinvestor_most_owned,
    superinvestor_biggest,
    superinvestor_activity,
    insider_most_active,
    insider_activity,
    insider_biggest,
  } = data

  const siActivityDatasets = [
    [superinvestor_activity.buys_1q, superinvestor_activity.buys_2q],
    [superinvestor_activity.sells_1q, superinvestor_activity.sells_2q],
  ] as const

  const insiderActivityDatasets = [
    [insider_activity.buys_30d, insider_activity.buys_90d],
    [insider_activity.sells_30d, insider_activity.sells_90d],
  ] as const

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* ── Section 1: Hero ────────────────────────────────────────────────── */}
      <section className="py-20 max-w-3xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-5 leading-tight">
          Track What the Smart Money Is Doing
        </h1>
        <p className="text-lg text-white/55 mb-10 leading-relaxed">
          Real-time SEC insider trades and superinvestor 13F portfolios,
          organized and searchable.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link
            href="/insiders"
            className="inline-flex items-center justify-center px-7 py-3 rounded-lg bg-white text-[#0f1117] font-semibold hover:bg-white/90 transition-colors"
          >
            Insider Trades →
          </Link>
          <Link
            href="/superinvestors"
            className="inline-flex items-center justify-center px-7 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 hover:border-white/35 transition-colors"
          >
            Superinvestors →
          </Link>
        </div>

        {/* Stat row */}
        <div className="flex items-center justify-center gap-3 text-sm text-white/40 flex-wrap">
          <span>
            <span className="font-semibold text-white/70 tabular-nums">
              {stats.insider_count.toLocaleString('en-US')}
            </span>{' '}
            insider trades
          </span>
          <span className="text-white/20">·</span>
          <span>
            <span className="font-semibold text-white/70 tabular-nums">{stats.superinvestor_count}</span>{' '}
            superinvestors
          </span>
          <span className="text-white/20">·</span>
          <span>Updated daily</span>
        </div>
      </section>

      {/* ── Section 2: Superinvestors Top 10 ─────────────────────────────── */}
      <section className="pb-16">
        <SectionHeader
          title="Superinvestors"
          subtitle="Recently updated portfolios"
          seeAllHref="/superinvestors"
        />

        {superinvestors_top10.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/3 p-12 text-center text-sm text-white/30">
            No data yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-white/40 uppercase tracking-wide">
                      Superinvestor
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-white/40 uppercase tracking-wide">
                      Portfolio
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                      Stocks
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden md:table-cell">
                      Last update
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {superinvestors_top10.map((si: SuperinvestorTop10Row) => (
                    <tr key={si.id} className="hover:bg-white/3 transition-colors group">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/superinvestors/${si.id}`}
                          className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
                        >
                          {si.name}
                          {si.fund_name && (
                            <span className="text-white/40 font-normal"> – {si.fund_name}</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-white">
                        {si.total_aum_usd > 0 ? formatValuePlus(si.total_aum_usd) : '–'}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-white/60 hidden sm:table-cell">
                        {si.holdings_count > 0 ? si.holdings_count : '–'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/40 text-xs hidden md:table-cell whitespace-nowrap">
                        {formatFilingDate(si.latest_filing_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SeeAllButton href="/superinvestors" label="See all superinvestors" />
          </>
        )}
      </section>

      {/* ── Section 3: Three superinvestor cards ──────────────────────────── */}
      <section className="pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Most owned */}
          <CardShell title="Top 10 Most Owned" seeMoreHref="/grand-portfolio?source=superinvestors">
            {superinvestor_most_owned.length === 0 ? (
              <EmptyCardRow />
            ) : (
              <TickerRows
                rows={superinvestor_most_owned.map((r: MostOwnedRow) => ({
                  ticker: r.ticker,
                  company_name: r.company_name,
                  value: r.investor_count,
                }))}
                valueLabel="Gurus"
                valueColor="text-violet-400"
              />
            )}
          </CardShell>

          {/* Card 2: Activity (buys/sells) — client component */}
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
            {superinvestor_biggest.length === 0 ? (
              <EmptyCardRow />
            ) : (
              <TickerRows
                rows={superinvestor_biggest.map((r: BiggestRow) => ({
                  ticker: r.ticker,
                  company_name: r.company_name,
                  value: r.total_value,
                }))}
                valueLabel="Value"
                valueFormatter={formatValuePlus}
                valueColor="text-white/70"
              />
            )}
          </CardShell>
        </div>
      </section>

      {/* ── Section 4: Insider divider ────────────────────────────────────── */}
      <section className="pb-10">
        <Divider title="Insider Trades" subtitle="SEC Form 4 disclosures" />
      </section>

      {/* ── Section 5: Three insider cards ───────────────────────────────── */}
      <section className="pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Most active insiders */}
          <CardShell title="Top 10 Most Active Insiders" seeMoreHref="/insiders">
            {insider_most_active.length === 0 ? (
              <EmptyCardRow />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-2 text-left font-medium text-white/30">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-white/30 hidden sm:table-cell">Company</th>
                    <th className="px-4 py-2 text-right font-medium text-white/30">Trades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {insider_most_active.map((row: MostActiveInsiderRow) => (
                    <tr key={row.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-2">
                        <Link
                          href={`/insiders/${row.id}`}
                          className="font-medium text-violet-400 hover:text-violet-300 transition-colors truncate block max-w-[110px]"
                        >
                          {row.name ?? '–'}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-white/40 truncate max-w-[120px] hidden sm:table-cell text-[11px]">
                        {row.primary_company ?? '–'}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-white/70">
                        {row.trade_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardShell>

          {/* Card 2: Activity (buys/sells) — client component */}
          <ActivityCard
            title="Top 10"
            opt1Labels={['Buys', 'Sells']}
            opt2Labels={['30 Days', '90 Days']}
            datasets={insiderActivityDatasets}
            countLabel="Insiders"
            isBuyFirst={true}
            seeMoreHref="/grand-portfolio?source=insiders"
          />

          {/* Card 3: Biggest trades */}
          <CardShell title="Top 10 Biggest Trades" seeMoreHref="/insiders">
            {insider_biggest.length === 0 ? (
              <EmptyCardRow />
            ) : (
              <TickerRows
                rows={insider_biggest.map((r: BiggestRow) => ({
                  ticker: r.ticker,
                  company_name: r.company_name,
                  value: r.total_value,
                }))}
                valueLabel="Volume"
                valueFormatter={formatValuePlus}
                valueColor="text-white/70"
              />
            )}
          </CardShell>
        </div>
      </section>

      {/* ── Section 6: About / Explainer ──────────────────────────────────── */}
      <section className="pb-20">
        <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Text */}
            <div className="px-10 py-14">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">
                investing tools
              </p>
              <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                Make more informed
                <br />investment decisions
              </h2>
              <p className="text-white/50 mb-10 leading-relaxed text-sm">
                Track what the world&apos;s best investors are buying and selling —
                sourced directly from public SEC filings.
              </p>

              {/* FAQ items */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-violet-400 font-bold mt-0.5 shrink-0">&gt;&gt;</span>
                    <h3 className="text-sm font-semibold text-white">What are 13F Filings?</h3>
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed pl-6">
                    13F filings are quarterly reports submitted to the SEC by any investment
                    manager controlling at least $100M. The managers we track are well-known
                    value investors like Warren Buffett. They must file within 45 days of each
                    quarter end, disclosing all qualifying US equity positions.
                  </p>
                </div>

                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-violet-400 font-bold mt-0.5 shrink-0">&gt;&gt;</span>
                    <h3 className="text-sm font-semibold text-white">Why track insider trades?</h3>
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed pl-6">
                    Company insiders — directors, executives, and major shareholders — must report
                    their own stock trades within 2 business days via SEC Form 4. When insiders
                    buy their own stock, it can signal strong conviction in the company&apos;s future.
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href="/superinvestors"
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/20 text-sm text-white/70 hover:text-white hover:border-white/40 transition-colors"
                >
                  <span>👥</span> Superinvestors
                </Link>
              </div>
            </div>

            {/* Right: Animation */}
            <div className="flex items-center justify-center px-10 py-14 border-t lg:border-t-0 lg:border-l border-white/8">
              <NetworkAnimation />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
