'use client'

import { useEffect, useRef, useState } from 'react'
import type { TocHeading } from '@/lib/toc'

interface Props {
  headings: TocHeading[]
}

export function TableOfContents({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length === 0) return

    // Track which headings are visible; highlight the topmost one
    const visible = new Set<string>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id)
          } else {
            visible.delete(entry.target.id)
          }
        }

        // Pick the first heading in document order that is currently visible
        const ordered = headings.map((h) => h.id)
        const topVisible = ordered.find((id) => visible.has(id))
        if (topVisible) setActiveId(topVisible)
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      },
    )

    for (const { id } of headings) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav aria-label="Table of contents">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/40 mb-4">
        Contents
      </p>
      <ul className="space-y-0.5">
        {headings.map((h) => {
          const isActive = h.id === activeId
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setActiveId(h.id)
                }}
                className={`
                  block py-1.5 pr-3 text-[13px] leading-snug transition-all duration-150 border-l-2
                  ${h.level === 3 ? 'pl-5' : 'pl-3'}
                  ${
                    isActive
                      ? 'border-violet-500 text-white font-medium'
                      : 'border-transparent text-white/35 hover:text-white/65 hover:border-white/20'
                  }
                `}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
