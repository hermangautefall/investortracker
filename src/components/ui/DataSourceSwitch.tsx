'use client'

import Link from 'next/link'

type Source = 'insiders' | 'superinvestors' | 'all'

const LABELS: Record<Source, string> = {
  insiders: 'Insiders',
  superinvestors: 'Superinvestors',
  all: 'All',
}

export function DataSourceSwitch({
  value,
  urls,
}: {
  value: Source
  urls: Record<Source, string>
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/3 p-0.5 w-full sm:w-auto">
      {(Object.keys(LABELS) as Source[]).map((source) => (
        <Link
          key={source}
          href={urls[source]}
          className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === source
              ? 'bg-white/15 text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          {LABELS[source]}
        </Link>
      ))}
    </div>
  )
}

export type { Source }
