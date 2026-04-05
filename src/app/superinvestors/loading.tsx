import { TableSkeleton } from '@/components/ui/TableSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-7 w-40 rounded bg-white/8 animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-white/5 animate-pulse" />
      </div>
      <TableSkeleton rows={15} />
    </main>
  )
}
