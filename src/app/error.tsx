'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-3">Error</p>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-white/50 mb-8 max-w-sm mx-auto">
          An unexpected error occurred. You can try again or return to the home page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-white text-[#0f1117] text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-md border border-white/15 text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
