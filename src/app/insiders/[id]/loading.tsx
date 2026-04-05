import { TableSkeleton } from '@/components/ui/TableSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Name + role skeleton */}
      <div className="mb-8">
        <div className="h-7 w-48 rounded bg-white/8 animate-pulse mb-2" />
        <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-4">
            <div className="h-6 w-16 rounded bg-white/8 animate-pulse mb-1" />
            <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={10} />
    </main>
  )
}
