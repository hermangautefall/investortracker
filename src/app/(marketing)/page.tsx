import Link from 'next/link'

export const revalidate = 60

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">InvestorTracker</h1>
      <p className="text-muted-foreground text-lg mb-8">
        Track congressional stock trades and SEC insider filings in real time.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/politicians"
          className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          Politicians
        </Link>
        <Link
          href="/insiders"
          className="px-6 py-3 rounded-md border font-medium hover:bg-muted transition-colors"
        >
          Insiders
        </Link>
      </div>
    </main>
  )
}
