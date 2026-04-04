export function TradeBadge({ type }: { type: string | null }) {
  const t = (type ?? '').toLowerCase()
  if (t === 'buy' || t === 'p') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        Buy
      </span>
    )
  }
  if (t === 'sell' || t === 's') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        Sell
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
      Option
    </span>
  )
}
