import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatDate } from '@/lib/formatters'

export const revalidate = 60

async function getStats() {
  const supabase = getAdminClient()
  const [it, ct, runs] = await Promise.all([
    supabase.from('insider_trades').select('id', { count: 'exact', head: true }),
    supabase.from('congress_trades').select('id', { count: 'exact', head: true }),
    supabase
      .from('pipeline_runs')
      .select('ran_at')
      .eq('job_name', 'fetch_form4')
      .eq('status', 'success')
      .order('ran_at', { ascending: false })
      .limit(1),
  ])
  return {
    insiderCount: it.count ?? 0,
    congressCount: ct.count ?? 0,
    lastUpdated: runs.data?.[0]?.ran_at ?? null,
  }
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
      {/* Hero */}
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-5">
          Track What Insiders Are Actually Trading
        </h1>
        <p className="text-lg text-white/60 mb-10 leading-relaxed">
          Real-time SEC Form 4 disclosures and congressional stock trades,
          organized and searchable.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/insiders"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-[#0f1117] font-semibold hover:bg-white/90 transition-colors"
          >
            Insider Trades →
          </Link>
          <Link
            href="/politicians"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
          >
            Congressional Trades →
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-left">
          <p className="text-3xl font-bold text-white tabular-nums">
            {stats.insiderCount.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-sm text-white/50">insider trades tracked</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-left">
          <p className="text-3xl font-bold text-white/30 tabular-nums">
            {stats.congressCount.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-sm text-white/50">congressional trades (coming soon)</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-left">
          <p className="text-sm font-medium text-white/40 uppercase tracking-wide mb-1">
            Last updated
          </p>
          <p className="text-lg font-semibold text-white">
            {stats.lastUpdated ? formatDate(stats.lastUpdated) : '—'}
          </p>
        </div>
      </div>
    </main>
  )
}
