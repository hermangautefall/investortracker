import { TableSkeleton } from '@/components/ui/TableSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="h-7 w-56 rounded bg-white/8 animate-pulse mb-2" />
        <div className="h-4 w-72 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-14 rounded-md bg-white/8 animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={15} />
    </main>
  )
}
