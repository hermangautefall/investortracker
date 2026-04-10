import { Info } from 'lucide-react'

export const revalidate = 60

const selectCls =
  'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/40 ' +
  'cursor-not-allowed opacity-50'

export default function PoliticiansPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Congressional Trades</h1>

      {/* Filter bar — visible but disabled */}
      <div className="mb-6 flex flex-wrap gap-2">
        <select disabled className={selectCls}>
          <option>All chambers</option>
        </select>
        <select disabled className={selectCls}>
          <option>All parties</option>
        </select>
        <select disabled className={selectCls}>
          <option>All types</option>
        </select>
        <select disabled className={selectCls}>
          <option>Last 30 days</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            disabled
            placeholder="Search politician or ticker..."
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/40 placeholder:text-white/20 cursor-not-allowed opacity-50"
          />
        </div>
      </div>

      {/* Notice */}
      <div className="card-glow rounded-xl bg-white/[0.03] p-10 text-center flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <Info size={18} className="text-white/40" />
        </div>
        <div>
          <p className="text-white/70 font-medium mb-1">Data coming soon</p>
          <p className="text-sm text-white/40 max-w-sm mx-auto">
            Congressional trade data is being sourced and will appear here shortly. Check back soon.
          </p>
        </div>
      </div>
    </main>
  )
}
