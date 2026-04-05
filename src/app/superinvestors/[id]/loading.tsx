import { TableSkeleton } from '@/components/ui/TableSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-4 w-32 rounded bg-white/5 animate-pulse mb-6" />
      <div className="mb-8">
        <div className="h-7 w-48 rounded bg-white/8 animate-pulse mb-2" />
        <div className="h-4 w-56 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-5">
            <div className="h-7 w-20 rounded bg-white/8 animate-pulse mb-1.5" />
            <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 rounded-md bg-white/8 animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={12} />
    </main>
  )
}
