export const revalidate = 3600

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-white/40 mb-10">Last updated: April 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Overview</h2>
          <p>
            [SITE NAME] is a read-only financial transparency platform. We do not require
            user accounts, and we do not collect personal information from visitors. This
            policy explains what limited data is collected and how it is used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Data We Collect</h2>
          <p>
            We currently collect no personally identifiable information from users. The
            site does not require registration, login, or any form submission. You can
            browse all content anonymously.
          </p>
          <p className="mt-3">
            We may collect anonymous usage analytics (see Analytics section below) to
            understand how the site is used and improve it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Analytics</h2>
          <p>
            We use Google Analytics to collect anonymized data about site usage, including
            pages visited, time on site, and general geographic region (country level).
            This data is aggregated and cannot be used to identify individual visitors.
          </p>
          <p className="mt-3">
            Google Analytics uses cookies to distinguish users. You can opt out of Google
            Analytics tracking by installing the{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-2 hover:text-white/70 transition-colors"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
          <p>
            We use only analytics cookies (Google Analytics). We do not use tracking
            cookies, advertising cookies, or any cookies that identify you personally.
            No cookie consent is required in jurisdictions where analytics-only cookies
            are permitted without consent, but we respect browser Do Not Track settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong className="text-white">Supabase</strong> — our database provider.
              Data is stored in a Supabase-hosted PostgreSQL instance. See{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2 hover:text-white/70">
                Supabase's Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong className="text-white">Vercel</strong> — our hosting provider.
              Server logs (including IP addresses) may be retained by Vercel for a limited
              period. See{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2 hover:text-white/70">
                Vercel's Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong className="text-white">Google Analytics</strong> — see above.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Data Retention</h2>
          <p>
            Since we do not collect personal information, there is no personal data to
            retain or delete. Anonymous analytics data is retained by Google Analytics
            per their standard retention policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Changes to This Policy</h2>
          <p>
            This policy may be updated as we add new features (such as user accounts).
            The "Last updated" date at the top of this page reflects the most recent
            revision. Continued use of the site constitutes acceptance of the current
            policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
          <p>
            Questions about this privacy policy can be directed to{' '}
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
