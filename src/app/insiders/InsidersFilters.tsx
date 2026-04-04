'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

type Props = {
  currentType: string
  currentMinValue: string
  currentDays: string
  currentQ: string
  lastUpdated: string
}

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'option_exercise', label: 'Option exercise' },
]

const AMOUNT_OPTIONS = [
  { value: '', label: 'All amounts' },
  { value: '100000', label: '>$100K' },
  { value: '1000000', label: '>$1M' },
  { value: '10000000', label: '>$10M' },
]

const DAYS_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 1 year' },
]

const selectCls =
  'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 ' +
  'focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-colors cursor-pointer'

export function InsidersFilters({
  currentType,
  currentMinValue,
  currentDays,
  currentQ,
  lastUpdated,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(currentQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local search in sync when navigating back/forward
  useEffect(() => {
    setSearch(currentQ)
  }, [currentQ])

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      params.delete('page')
      startTransition(() => {
        router.push(`/insiders?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handleSearch = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl({ q: value.trim() || undefined })
    }, 300)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter row + last updated */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={currentType}
            onChange={(e) => updateUrl({ type: e.target.value || undefined })}
            className={selectCls}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={currentMinValue}
            onChange={(e) => updateUrl({ min_value: e.target.value || undefined })}
            className={selectCls}
          >
            {AMOUNT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={currentDays}
            onChange={(e) => updateUrl({ days: e.target.value || undefined })}
            className={selectCls}
          >
            {DAYS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {lastUpdated && (
          <span className="text-xs text-white/30 ml-auto">
            Last updated:{' '}
            {new Date(lastUpdated).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search insider or ticker..."
          className="w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-colors"
        />
      </div>
    </div>
  )
}
