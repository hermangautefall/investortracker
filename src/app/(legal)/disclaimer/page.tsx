export const revalidate = 3600

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Disclaimer</h1>
      <p className="text-sm text-white/40 mb-10">Last updated: April 2026</p>

      {/* Prominent notice */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 mb-10">
        <p className="text-lg font-semibold text-yellow-200 mb-2">
          This site is not financial advice.
        </p>
        <p className="text-yellow-200/70 text-sm leading-relaxed">
          [SITE NAME] displays public government data for informational purposes only.
          Nothing on this site should be interpreted as a recommendation to buy, sell,
          or hold any security.
        </p>
      </div>

      <div className="space-y-6 text-white/70 leading-relaxed text-sm">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Public Data Only</h2>
          <p>
            All information displayed on this site is sourced from public government
            records — specifically SEC EDGAR Form 4 filings and congressional disclosure
            filings under the STOCK Act. These records are freely available to any
            member of the public. [SITE NAME] does not create, modify, or interpret this
            data — we aggregate and display it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Not Investment Advice</h2>
          <p>
            [SITE NAME] is not a registered investment advisor. We do not provide
            personalized financial advice, recommendations, or guidance. The data shown
            on this site — including insider trade histories, congressional disclosures,
            and portfolio summaries — is provided for transparency and informational
            purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Past Activity Does Not Predict Future Performance</h2>
          <p>
            Past trading patterns of corporate insiders, politicians, or any other
            individuals displayed on this site do not predict or guarantee future
            investment performance. Historical disclosure data reflects transactions that
            have already occurred and may not be relevant to current market conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Data Accuracy</h2>
          <p>
            While we work to display data accurately, information may be delayed,
            incomplete, or contain errors from the original source filings. Always
            verify important information directly from official sources such as the{' '}
            <a
              href="https://www.sec.gov/cgi-bin/browse-edgar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-2 hover:text-white/70 transition-colors"
            >
              SEC EDGAR database
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Do Your Own Research</h2>
          <p>
            Always conduct your own independent research before making any investment
            decision. The information on this site is one of many inputs you should
            consider — not a sole basis for financial decisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Consult a Professional</h2>
          <p>
            Consult a licensed financial advisor, broker, or other qualified professional
            before making investment decisions. A professional advisor can provide
            personalized guidance based on your financial situation, goals, and risk
            tolerance.
          </p>
        </section>

      </div>
    </main>
  )
}
