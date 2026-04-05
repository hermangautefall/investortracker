export const revalidate = 3600

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">About DataHeimdall</h1>
      <p className="text-sm text-white/40 mb-10">Financial transparency, made accessible.</p>

      <div className="space-y-8 text-white/70 leading-relaxed text-sm">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What We Do</h2>
          <p>
            DataHeimdall tracks and displays two categories of financial disclosure data:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>
              <strong className="text-white">SEC Form 4 filings</strong> — required
              disclosures by corporate insiders (executives, directors, and major
              shareholders) when they buy or sell stock in their own company.
            </li>
            <li>
              <strong className="text-white">Congressional disclosures</strong> — stock
              trades made by U.S. senators and representatives, required under the
              STOCK Act (Stop Trading on Congressional Knowledge Act).
            </li>
          </ul>
          <p className="mt-3">
            We aggregate this publicly available data, organize it into a searchable
            interface, and surface patterns that would otherwise require hours of manual
            research.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Why We Built This</h2>
          <p>
            Corporate insiders and elected officials are required by law to publicly
            disclose their stock trades — but that data is scattered across government
            databases in formats that are difficult to search, cross-reference, or
            understand at a glance.
          </p>
          <p className="mt-3">
            DataHeimdall exists to make this public information genuinely accessible.
            We believe financial transparency supports better-informed citizens and
            markets. Anyone should be able to see, quickly and clearly, what the people
            running public companies and writing public policy are doing with their own
            money.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Data Sources</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-white/8 bg-white/3 p-4">
              <p className="font-medium text-white mb-1">SEC EDGAR</p>
              <p>
                Form 4 filings are sourced directly from the U.S. Securities and
                Exchange Commission's public EDGAR database. Data is fetched daily
                and reflects official filings as submitted.
              </p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/3 p-4">
              <p className="font-medium text-white mb-1">STOCK Act Disclosures</p>
              <p>
                Congressional trade disclosures are sourced from public disclosure
                databases. Data availability depends on timely filing by elected
                officials as required by law.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Update Frequency</h2>
          <p>
            Our data pipeline runs daily at 08:00 UTC. New insider trade filings
            typically appear within 24–48 hours of being submitted to the SEC
            (Form 4 filings are required within 2 business days of the transaction).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Technology</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: 'Next.js', desc: 'Frontend' },
              { name: 'Supabase', desc: 'Database' },
              { name: 'Python', desc: 'Data pipeline' },
              { name: 'SEC EDGAR', desc: 'Primary data source' },
              { name: 'Vercel', desc: 'Hosting' },
              { name: 'GitHub Actions', desc: 'Scheduling' },
            ].map((item) => (
              <div key={item.name} className="rounded-lg border border-white/8 bg-white/3 p-3">
                <p className="font-medium text-white text-xs">{item.name}</p>
                <p className="text-white/40 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Important Note</h2>
          <p>
            DataHeimdall displays public information for transparency purposes only. This
            is not financial advice. See our{' '}
            <a href="/disclaimer" className="text-white underline underline-offset-2 hover:text-white/70 transition-colors">
              Disclaimer
            </a>{' '}
            and{' '}
            <a href="/terms" className="text-white underline underline-offset-2 hover:text-white/70 transition-colors">
              Terms of Service
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
          <p>
            Questions, feedback, or data corrections:{' '}
            <a
              href="mailto:hello@dataheimdall.com"
              className="text-white underline underline-offset-2 hover:text-white/70 transition-colors"
            >
              hello@dataheimdall.com
            </a>
          </p>
        </section>

      </div>
    </main>
  )
}
