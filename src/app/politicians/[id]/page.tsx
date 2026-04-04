import Link from 'next/link'
import { ChevronLeft, Info } from 'lucide-react'

export const revalidate = 60

export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // params consumed to satisfy Next.js — id will be used once data is available
  await params

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/politicians"
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Congressional Trades
      </Link>

      <h1 className="text-2xl font-bold text-white mb-8">Politician Profile</h1>

      <div className="rounded-xl border border-white/8 bg-white/3 p-10 text-center flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <Info size={18} className="text-white/40" />
        </div>
        <div>
          <p className="text-white/70 font-medium mb-1">No trades on record yet</p>
          <p className="text-sm text-white/40 max-w-sm mx-auto">
            No trades on record for this politician yet.
          </p>
        </div>
      </div>
    </main>
  )
}
