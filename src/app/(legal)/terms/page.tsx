export const revalidate = 3600

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-white/40 mb-10">Last updated: April 2026</p>

      <div className="space-y-8 text-white/70 leading-relaxed text-sm">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Acceptance of Terms</h2>
          <p>
            By accessing and using [SITE NAME], you accept and agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use the
            site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Nature of the Service</h2>
          <p>
            [SITE NAME] aggregates and displays publicly available financial disclosure
            data, including:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-3">
            <li>SEC Form 4 filings (insider trade disclosures)</li>
            <li>Congressional stock trade disclosures under the STOCK Act</li>
          </ul>
          <p className="mt-3">
            All data displayed on this site is sourced from U.S. government public
            records and is available to any member of the public.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Not Financial Advice</h2>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-yellow-200/80">
            <p className="font-semibold text-yellow-200 mb-2">Important Disclaimer</p>
            <p>
              The information provided on [SITE NAME] is for informational purposes only
              and does not constitute financial, investment, legal, or tax advice.
              [SITE NAME] is not a registered investment advisor, broker-dealer, or
              financial institution.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">No Guarantee of Accuracy</h2>
          <p>
            While we strive to display accurate and up-to-date information, we make no
            representations or warranties of any kind, express or implied, about the
            completeness, accuracy, reliability, suitability, or availability of the
            information on this site.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-3">
            <li>Data may be delayed, incomplete, or contain errors</li>
            <li>Source filings may themselves contain errors or omissions</li>
            <li>Data pipelines may experience outages or lag</li>
            <li>Corporate actions (splits, name changes) may not be reflected immediately</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Assumption of Risk</h2>
          <p>
            Any reliance you place on the information displayed on this site is strictly
            at your own risk. You assume full responsibility for any investment decisions
            you make based on information from this site. [SITE NAME] shall not be liable
            for any loss or damage arising from your use of, or reliance on, information
            on this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Intellectual Property</h2>
          <p>
            The underlying data displayed (SEC filings, congressional disclosures) is
            public domain. The presentation, design, and software of [SITE NAME] are
            proprietary. You may not scrape, copy, or redistribute our compiled data
            products without prior written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Modifications</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the
            site after changes constitutes acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
          <p>
            Questions about these terms can be directed to{' '}
            <a
              href="mailto:[CONTACT EMAIL]"
              className="text-white underline underline-offset-2 hover:text-white/70 transition-colors"
            >
              [CONTACT EMAIL]
            </a>
            .
          </p>
        </section>

      </div>
    </main>
  )
}
