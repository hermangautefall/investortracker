'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QuarterSelectProps {
  quarters: string[]        // e.g. ['2025Q4', '2025Q3', ...]  sorted newest-first
  selected: string          // currently selected quarter key
  buildUrl: (q: string) => string  // called with quarter to produce nav URL
}

/** Convert "2025Q4" → "Q4 2025" for display */
function fmt(q: string): string {
  const m = q.match(/^(\d{4})Q(\d)$/)
  return m ? `Q${m[2]} ${m[1]}` : q
}

export function QuarterSelect({ quarters, selected, buildUrl }: QuarterSelectProps) {
  const router = useRouter()

  // Group by year (key = "2025", value = ["2025Q4", "2025Q3", ...])
  const byYear: Record<string, string[]> = {}
  for (const q of quarters) {
    const m = q.match(/^(\d{4})/)
    const year = m ? m[1] : 'Other'
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(q)
  }
  // Years sorted descending
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-white/30 hidden sm:inline">Quarter:</span>
      <Select
        value={selected}
        onValueChange={(q) => router.push(buildUrl(q))}
      >
        <SelectTrigger className="h-8 text-xs w-[110px] bg-white/5 border-white/10 text-white focus:ring-0 focus:ring-offset-0">
          <SelectValue>{fmt(selected)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0f1117] border-white/10 text-white max-h-72 overflow-y-auto">
          {years.map((year) => (
            <SelectGroup key={year}>
              <SelectLabel className="text-white/30 text-[10px] px-2 py-1">{year}</SelectLabel>
              {byYear[year].map((q) => (
                <SelectItem
                  key={q}
                  value={q}
                  className="text-xs text-white/70 focus:bg-white/10 focus:text-white cursor-pointer"
                >
                  {fmt(q)}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
