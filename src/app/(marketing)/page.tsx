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

export const metadata = {
  title: 'DataHeimdall – Track Smart Money Trades',
  description:
    'Follow superinvestor 13F portfolios and SEC insider trades in real time. See what Warren Buffett, Bill Ackman, and other value investors are buying.',
  alternates: { canonical: 'https://dataheimdall.com/' },
}

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
    <div className="card-glow rounded-xl bg-white/[0.03] flex flex-col overflow-hidden backdrop-blur-sm">
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{title}</span>
        <Link
          href={seeMoreHref}
          className="text-[10px] text-violet-400/50 hover:text-violet-300 transition-colors"
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
          <tr key={`${row.ticker}-${i}`} className="hover:bg-white/[0.04] transition-colors">
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
    <div className="flex items-end justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-white/40">{subtitle}</p>
        </div>
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="text-sm text-violet-400/70 hover:text-violet-300 transition-colors mb-0.5"
        >
          See all →
        </Link>
      )}
    </div>
  )
}

function SeeAllButton({ href, label = 'See all superinvestors' }: { href: string; label?: string }) {
  return (
    <div className="flex justify-center mt-8">
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-violet-500/20 text-sm text-violet-300/70 hover:text-violet-200 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
      >
        {label}
      </Link>
    </div>
  )
}

function Divider({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-6 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="text-center shrink-0">
        <div className="text-xl font-bold gradient-text-violet">{title}</div>
        <div className="text-xs text-white/40 mt-1">{subtitle}</div>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
      {/* ── Background pattern overlay (covers entire page) ── */}
      <div className="fixed inset-0 bg-dot-pattern pointer-events-none z-0" aria-hidden="true" />

      {/* ── Section 1: Hero ────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 max-w-3xl mx-auto text-center">
        {/* Glow orbs */}
        <div className="hero-glow -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/20" aria-hidden="true" />
        <div className="hero-glow top-10 left-1/4 w-[200px] h-[200px] bg-indigo-500/15" style={{ animationDelay: '2s' }} aria-hidden="true" />
        <div className="hero-glow top-20 right-1/4 w-[180px] h-[180px] bg-purple-500/10" style={{ animationDelay: '4s' }} aria-hidden="true" />

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-5">
            Financial Transparency Platform
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1] gradient-text">
            Track What the
            <br />Smart Money Is Doing
          </h1>

          <p className="text-lg text-white/50 mb-12 leading-relaxed max-w-xl mx-auto">
            Real-time SEC insider trades and superinvestor 13F portfolios,
            organized and searchable.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/insiders"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
            >
              Insider Trades →
            </Link>
            <Link
              href="/superinvestors"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-white/15 text-white font-medium hover:bg-white/5 hover:border-white/30 transition-all"
            >
              Superinvestors →
            </Link>
          </div>

          {/* Stat pills */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/8 text-sm">
              <span className="font-semibold text-violet-400 tabular-nums">
                {stats.insider_count.toLocaleString('en-US')}
              </span>
              <span className="text-white/40">insider trades</span>
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/8 text-sm">
              <span className="font-semibold text-violet-400 tabular-nums">{stats.superinvestor_count}</span>
              <span className="text-white/40">superinvestors</span>
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/8 text-sm text-white/40">
              Updated daily
            </span>
          </div>
        </div>
      </section>

      {/* ── Section 2: Superinvestors Top 10 ─────────────────────────────── */}
      <section className="relative pb-20 z-10">
        <SectionHeader
          title="Superinvestors"
          subtitle="Recently updated portfolios"
          seeAllHref="/superinvestors"
        />

        {superinvestors_top10.length === 0 ? (
          <div className="card-glow rounded-xl bg-white/[0.03] p-12 text-center text-sm text-white/30">
            No data yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto card-glow rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.04]">
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-white/40 uppercase tracking-wide">
                      Superinvestor
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                      Portfolio
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-white/40 uppercase tracking-wide">
                      Stocks
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden md:table-cell">
                      Last update
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {superinvestors_top10.map((si: SuperinvestorTop10Row) => (
                    <tr key={si.id} className="hover:bg-white/[0.04] transition-colors group">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/superinvestors/${si.id}`}
                          className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
                        >
                          {si.name}
                          {si.fund_name && (
                            <span className="text-white/35 font-normal"> – {si.fund_name}</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-white hidden sm:table-cell">
                        {si.total_aum_usd > 0 ? formatValuePlus(si.total_aum_usd) : '–'}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-white/60">
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
      <section className="relative pb-20 z-10">
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
      <section className="relative pb-12 z-10">
        <Divider title="Insider Trades" subtitle="SEC Form 4 disclosures" />
      </section>

      {/* ── Section 5: Three insider cards ───────────────────────────────── */}
      <section className="relative pb-24 z-10">
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
                    <tr key={row.id} className="hover:bg-white/[0.04] transition-colors">
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
      <section className="relative pb-24 z-10">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
          <div className="absolute inset-[1px] rounded-2xl bg-[#0f1117]" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Text */}
            <div className="px-10 py-14">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-[0.2em] mb-4">
                investing tools
              </p>
              <h2 className="text-3xl font-bold mb-5 leading-snug gradient-text">
                Make more informed
                <br />investment decisions
              </h2>
              <p className="text-white/45 mb-10 leading-relaxed text-sm">
                Track what the world&apos;s best investors are buying and selling —
                sourced directly from public SEC filings.
              </p>

              {/* FAQ items */}
              <div className="space-y-8">
                <div className="group">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="mt-1 w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <span className="text-violet-400 text-[10px] font-bold">13F</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">What are 13F Filings?</h3>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed pl-8">
                    13F filings are quarterly reports submitted to the SEC by any investment
                    manager controlling at least $100M. The managers we track are well-known
                    value investors like Warren Buffett. They must file within 45 days of each
                    quarter end, disclosing all qualifying US equity positions.
                  </p>
                </div>

                <div className="group">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="mt-1 w-5 h-5 rounded-md bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <span className="text-green-400 text-[10px] font-bold">F4</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">Why track insider trades?</h3>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed pl-8">
                    Company insiders — directors, executives, and major shareholders — must report
                    their own stock trades within 2 business days via SEC Form 4. When insiders
                    buy their own stock, it can signal strong conviction in the company&apos;s future.
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href="/superinvestors"
                  className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-violet-500/20 text-sm text-violet-300/70 hover:text-violet-200 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
                >
                  Explore Superinvestors →
                </Link>
              </div>
            </div>

            {/* Right: Animation */}
            <div className="flex items-center justify-center px-10 py-14 border-t lg:border-t-0 lg:border-l border-white/6">
              <NetworkAnimation />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
