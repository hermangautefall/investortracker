'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'

type InsiderResult = {
  id: string
  name: string | null
  primary_role: string | null
  primary_company: string | null
}

type SuperResult = {
  id: string
  name: string
  fund_name: string | null
}

type StockResult = {
  ticker: string
  company_name: string | null
}

type SearchResults = {
  insiders: InsiderResult[]
  superinvestors: SuperResult[]
  stocks: StockResult[]
}

type FlatItem =
  | { kind: 'insider'; data: InsiderResult; href: string; label: string; sub: string | null }
  | { kind: 'superinvestor'; data: SuperResult; href: string; label: string; sub: string | null }
  | { kind: 'stock'; data: StockResult; href: string; label: string; sub: string | null }

function buildFlat(results: SearchResults): FlatItem[] {
  const items: FlatItem[] = []
  for (const d of results.insiders) {
    items.push({
      kind: 'insider',
      data: d,
      href: `/insiders/${d.id}`,
      label: d.name ?? '–',
      sub: [d.primary_role, d.primary_company].filter(Boolean).join(' · ') || null,
    })
  }
  for (const d of results.superinvestors) {
    items.push({
      kind: 'superinvestor',
      data: d,
      href: `/superinvestors/${d.id}`,
      label: d.name,
      sub: d.fund_name,
    })
  }
  for (const d of results.stocks) {
    items.push({
      kind: 'stock',
      data: d,
      href: `/tickers/${d.ticker}`,
      label: d.ticker,
      sub: d.company_name,
    })
  }
  return items
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flat = results ? buildFlat(results) : []
  const hasResults = flat.length > 0
  const isEmpty = results !== null && flat.length === 0

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`)
      const data: SearchResults = await res.json()
      setResults(data)
      setOpen(true)
      setActiveIdx(-1)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && flat[activeIdx]) {
        navigate(flat[activeIdx].href)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const SECTION_LABELS: Record<string, string> = {
    insider: 'Insiders',
    superinvestor: 'Superinvestors',
    stock: 'Stocks',
  }

  // Build sections for grouped display
  const sections: { kind: string; items: FlatItem[]; startIdx: number }[] = []
  let i = 0
  for (const kind of ['insider', 'superinvestor', 'stock'] as const) {
    const items = flat.filter((f) => f.kind === kind)
    if (items.length > 0) {
      sections.push({ kind, items, startIdx: i })
      i += items.length
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (results && flat.length > 0) setOpen(true) }}
          placeholder="Search insiders, stocks…"
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-colors"
        />
        {loading && (
          <Loader2
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin"
          />
        )}
      </div>

      {open && (hasResults || isEmpty) && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#0f1117] shadow-2xl overflow-hidden">
          {isEmpty ? (
            <div className="px-4 py-3 text-sm text-white/30">No results found</div>
          ) : (
            sections.map((section) => (
              <div key={section.kind}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                  {SECTION_LABELS[section.kind]}
                </div>
                {section.items.map((item, j) => {
                  const globalIdx = section.startIdx + j
                  const isActive = globalIdx === activeIdx
                  return (
                    <button
                      key={`${item.kind}-${globalIdx}`}
                      onMouseDown={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                        isActive ? 'bg-white/8' : 'hover:bg-white/5'
                      }`}
                    >
                      {item.kind === 'stock' ? (
                        <>
                          <span className="font-mono font-bold text-sm text-white w-14 shrink-0">{item.label}</span>
                          {item.sub && (
                            <span className="text-xs text-white/40 truncate">{item.sub}</span>
                          )}
                        </>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">{item.label}</div>
                          {item.sub && (
                            <div className="text-xs text-white/40 truncate">{item.sub}</div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
