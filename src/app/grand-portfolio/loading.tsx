import { TableSkeleton } from '@/components/ui/TableSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Tab strip skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 rounded-md bg-white/8 animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={15} />
    </main>
  )
}
