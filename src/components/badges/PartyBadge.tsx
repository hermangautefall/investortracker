export function PartyBadge({ party }: { party: string | null }) {
  const p = (party ?? '').toUpperCase()
  if (p === 'D' || p === 'DEMOCRAT') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        D
      </span>
    )
  }
  if (p === 'R' || p === 'REPUBLICAN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        R
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
      I
    </span>
  )
}
