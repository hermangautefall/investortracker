import { TableSkeleton } from '@/components/ui/TableSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 h-7 w-40 rounded bg-white/8 animate-pulse" />
      <div className="mb-6 h-10 rounded-xl bg-white/5 animate-pulse" />
      <TableSkeleton rows={15} />
    </main>
  )
}
