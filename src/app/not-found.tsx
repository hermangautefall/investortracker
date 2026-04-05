import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-3">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-sm text-white/50 mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-md bg-white text-[#0f1117] text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
