import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, TrendingUp, TrendingDown, Minus, ChevronLeft } from 'lucide-react'
import { getStockPageData, getAllStockTickers } from '@/lib/stocks'
import { TradeBadge } from '@/components/badges/TradeBadge'
import { PartyBadge } from '@/components/badges/PartyBadge'
import { formatDate, formatValue, formatShares, formatAmountRange } from '@/lib/formatters'
import type { Metadata } from 'next'
import type { SuperinvestorHolder, InsiderTradeRow, CongressTradeRow } from '@/lib/stocks'

export const revalidate = 3600

// ---------------------------------------------------------------------------
// Metadata & static params
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ ticker: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker: raw } = await params
  const ticker = raw.toUpperCase()
  const data = await getStockPageData(ticker)
  const company = data.companyName ?? ticker
  const url = `https://dataheimdall.com/stocks/${ticker}`

  return {
    title: `${ticker} Insider Trades & Superinvestor Holdings | DataHeimdall`,
    description: `Track insider buying and selling at ${company} (${ticker}). See which superinvestors own ${ticker} and recent SEC Form 4 filings.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${ticker} — Insider Trades & 13F Holdings`,
      description: `Who owns ${ticker}? Real-time insider trades and superinvestor positions for ${company}.`,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${ticker} Insider Trades & Superinvestor Holdings`,
      description: `Track ${company} (${ticker}) insider trades and institutional ownership on DataHeimdall.`,
    },
  }
}

export async function generateStaticParams() {
  const tickers = await getAllStockTickers()
  return tickers.map((ticker) => ({ ticker }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priceChange(prices: { date: string; close_price: number | null }[]) {
  if (prices.length < 2 || prices[0].close_price == null || prices[1].close_price == null) {
    return { change: null, pct: null }
  }
  const change = prices[0].close_price - prices[1].close_price
  const pct = (change / prices[1].close_price) * 100
  return { change, pct }
}

const ACTIVITY_STYLE: Record<string, string> = {
  new: 'bg-violet-500/15 text-violet-300',
  added: 'bg-green-500/15 text-green-400',
  reduced: 'bg-red-500/15 text-red-400',
  held: 'bg-white/5 text-white/40',
}

const ACTIVITY_LABEL: Record<string, string> = {
  new: 'New',
  added: 'Added',
  reduced: 'Reduced',
  held: 'Held',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Hero({
  ticker,
  companyName,
  prices,
}: {
  ticker: string
  companyName: string | null
  prices: { date: string; close_price: number | null }[]
}) {
  const latestPrice = prices[0]?.close_price
  const { change, pct } = priceChange(prices)
  const isUp = change !== null && change >= 0

  return (
    <div className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-4xl font-mono font-bold text-white tracking-tight">{ticker}</h1>
          {companyName && (
            <p className="mt-1 text-white/50 text-lg">{companyName}</p>
          )}
        </div>

        {latestPrice != null && (
          <div className="flex items-end gap-3">
            <span className="text-3xl font-semibold text-white tabular-nums">
              ${latestPrice.toFixed(2)}
            </span>
            {change !== null && pct !== null && (
              <span
                className={`flex items-center gap-1 text-sm font-medium pb-0.5 tabular-nums ${
                  isUp ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isUp ? '+' : ''}
                {change.toFixed(2)} ({isUp ? '+' : ''}
                {pct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {prices[0]?.date && (
        <p className="mt-2 text-xs text-white/25">
          Closing price as of {formatDate(prices[0].date)}
        </p>
      )}
    </div>
  )
}

function SuperinvestorSection({
  ticker,
  holders,
}: {
  ticker: string
  holders: SuperinvestorHolder[]
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {holders.length > 0
              ? `${holders.length} superinvestor${holders.length === 1 ? '' : 's'} own ${ticker}`
              : `Superinvestor holdings`}
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            Based on latest 13F filings — data is 45–90 days delayed
          </p>
        </div>
        <Link
          href="/superinvestor-consensus"
          className="text-xs text-white/40 hover:text-white/70 transition-colors shrink-0"
        >
          View consensus →
        </Link>
      </div>

      {holders.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
          <p className="text-sm text-white/30">
            No tracked superinvestors currently hold {ticker}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Investor</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Fund</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Weight</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden md:table-cell">Shares</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden lg:table-cell">Value</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden sm:table-cell">Quarter</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {holders.map((h) => (
                <tr key={h.investor_id} className="hover:bg-white/3 transition-colors">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/superinvestors/${h.investor_id}`}
                      className="text-violet-400 hover:text-violet-300 transition-colors text-xs font-medium"
                    >
                      {h.investor_name ?? '–'}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-white/40 text-xs hidden sm:table-cell">
                    {h.fund_name ?? '–'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white tabular-nums text-xs">
                    {h.portfolio_weight != null
                      ? `${Number(h.portfolio_weight).toFixed(2)}%`
                      : '–'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/50 tabular-nums text-xs hidden md:table-cell">
                    {formatShares(h.shares)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/50 tabular-nums text-xs hidden lg:table-cell">
                    {formatValue(h.value_usd)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/30 text-xs hidden sm:table-cell">
                    {h.quarter ?? '–'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {h.activity ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTIVITY_STYLE[h.activity]}`}
                      >
                        {ACTIVITY_LABEL[h.activity]}
                      </span>
                    ) : (
                      <span className="text-white/20 text-xs">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ClusterBadge() {
  return (
    <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wide">
      cluster
    </span>
  )
}

function InsiderSection({
  ticker,
  trades,
}: {
  ticker: string
  trades: InsiderTradeRow[]
}) {
  const hasClusters = trades.some((t) => t.cluster)

  return (
    <section className="mb-12">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">
          Recent insider activity — {ticker}
        </h2>
        <p className="text-xs text-white/40 mt-0.5">
          Open-market purchases (P) and sales (S) from SEC Form 4 filings · last 12 months
        </p>
        {hasClusters && (
          <p className="mt-1.5 text-xs text-amber-400/80">
            <span className="font-semibold">Cluster buy detected</span> — 3 or more insiders purchased within a 7-day window.
          </p>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
          <p className="text-sm text-white/30">
            No open-market insider trades in the last 12 months.
          </p>
          <p className="text-xs text-white/20 mt-1">
            Form 4 filings for option exercises and other transaction types are excluded.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Date</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Insider</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Role</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Type</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden md:table-cell">Shares</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40 hidden lg:table-cell">Avg Price</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.map((t) => (
                <tr
                  key={t.id}
                  className={`transition-colors ${
                    t.cluster
                      ? 'bg-amber-500/5 hover:bg-amber-500/10'
                      : 'hover:bg-white/3'
                  }`}
                >
                  <td className="px-3 py-2.5 text-white/60 whitespace-nowrap text-xs">
                    {formatDate(t.trade_date)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {t.insider_id ? (
                      <Link
                        href={`/insiders/${t.insider_id}`}
                        className="text-white hover:text-white/70 transition-colors"
                      >
                        {t.insider_name ?? '–'}
                      </Link>
                    ) : (
                      <span className="text-white/60">{t.insider_name ?? '–'}</span>
                    )}
                    {t.cluster && <ClusterBadge />}
                  </td>
                  <td className="px-3 py-2.5 text-white/40 text-xs hidden sm:table-cell">
                    {t.insider_role ?? '–'}
                  </td>
                  <td className="px-3 py-2.5">
                    <TradeBadge type={t.trade_type} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/50 tabular-nums text-xs hidden md:table-cell">
                    {formatShares(t.shares)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/50 tabular-nums text-xs hidden lg:table-cell">
                    {t.price_per_share != null ? `$${t.price_per_share.toFixed(2)}` : '–'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-white tabular-nums text-xs">
                    {formatValue(t.total_value)}
                    {t.form4_url && (
                      <a
                        href={t.form4_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 inline-flex text-white/25 hover:text-white/60 transition-colors"
                        aria-label="View Form 4 filing"
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
    </section>
  )
}

function CongressSection({
  ticker,
  trades,
}: {
  ticker: string
  trades: CongressTradeRow[]
}) {
  return (
    <section className="mb-12">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Congressional trades — {ticker}</h2>
        <p className="text-xs text-white/40 mt-0.5">
          STOCK Act disclosures · last 12 months
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
          <p className="text-sm text-white/30">Congressional trade data coming soon.</p>
          <p className="text-xs text-white/20 mt-1">
            We are sourcing STOCK Act disclosures and will display them here shortly.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Date</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Politician</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Chamber</th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Type</th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-3 py-2.5 text-white/60 whitespace-nowrap text-xs">
                    {formatDate(t.trade_date)}
                  </td>
                  <td className="px-3 py-2.5">
                    {t.politician_id ? (
                      <Link
                        href={`/politicians/${t.politician_id}`}
                        className="flex items-center gap-2 hover:text-white/70 transition-colors"
                      >
                        <PartyBadge party={t.party} />
                        <span className="text-white text-xs">{t.politician_name}</span>
                      </Link>
                    ) : (
                      <span className="text-white/40 text-xs">{t.politician_name ?? '–'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white/40 text-xs hidden sm:table-cell capitalize">
                    {t.chamber ?? '–'}
                  </td>
                  <td className="px-3 py-2.5">
                    <TradeBadge type={t.trade_type} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/60 text-xs tabular-nums">
                    {formatAmountRange(t.amount_min, t.amount_max)}
                    {t.filing_url && (
                      <a
                        href={t.filing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 inline-flex text-white/25 hover:text-white/60 transition-colors"
                        aria-label="View filing"
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
    </section>
  )
}

function RelatedContent({ ticker }: { ticker: string }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-white mb-4">Learn more</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            href: '/blog/what-is-sec-form-4',
            title: 'What Is SEC Form 4?',
            desc: `Understand the insider trade filings behind ${ticker} activity.`,
          },
          {
            href: '/blog/what-is-13f-filing',
            title: 'What Is a 13F Filing?',
            desc: 'How superinvestors disclose their quarterly holdings.',
          },
          {
            href: '/blog/insider-cluster-buying',
            title: 'Insider Cluster Buying',
            desc: 'Why multiple insiders buying together is a strong signal.',
          },
          {
            href: '/superinvestor-consensus',
            title: 'Superinvestor Consensus',
            desc: 'The most widely held stocks across all tracked institutions.',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-white/8 bg-white/3 p-4 hover:border-white/15 transition-colors group"
          >
            <p className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StockTickerPage({ params }: Props) {
  const { ticker: raw } = await params
  const ticker = raw.toUpperCase()

  const data = await getStockPageData(ticker)

  // 404 if no data at all for this ticker
  if (
    data.superinvestorHolders.length === 0 &&
    data.insiderTrades.length === 0 &&
    data.prices.length === 0
  ) {
    notFound()
  }

  // JSON-LD Dataset schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${ticker} Insider Trades and Institutional Holdings`,
    description: `SEC Form 4 insider transactions and 13F institutional holdings for ${data.companyName ?? ticker}`,
    url: `https://dataheimdall.com/stocks/${ticker}`,
    provider: {
      '@type': 'Organization',
      name: 'DataHeimdall',
      url: 'https://dataheimdall.com',
    },
    keywords: [
      `${ticker} insider trades`,
      `${ticker} 13F holdings`,
      `who owns ${ticker} stock`,
      `${data.companyName ?? ticker} insider buying`,
      `${data.companyName ?? ticker} superinvestors`,
    ].join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link
          href="/stocks"
          className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ChevronLeft size={14} /> All Stocks
        </Link>

        <Hero ticker={ticker} companyName={data.companyName} prices={data.prices} />

        <SuperinvestorSection ticker={ticker} holders={data.superinvestorHolders} />

        <InsiderSection ticker={ticker} trades={data.insiderTrades} />

        <CongressSection ticker={ticker} trades={data.congressTrades} />

        <RelatedContent ticker={ticker} />
      </main>
    </>
  )
}
