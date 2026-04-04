export function formatValue(value: number | null | undefined): string {
  if (value == null) return '–'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value.toLocaleString('en-US')}`
}

export function formatShares(shares: number | null | undefined): string {
  if (shares == null) return '–'
  return shares.toLocaleString('en-US')
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '–'
  // Use noon UTC to avoid timezone shift on date-only strings
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTicker(ticker: string | null | undefined): string {
  if (!ticker) return '–'
  return ticker.toUpperCase()
}

export function formatAmountRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min == null && max == null) return '–'
  return `${formatValue(min)}–${formatValue(max)}`
}
