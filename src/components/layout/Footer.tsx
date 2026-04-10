import Link from 'next/link'

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { href: '/insiders', label: 'Insider Trades' },
      /* HIDDEN: congress data pending FMP activation */
      // { href: '/politicians', label: 'Politicians' },
      { href: '/grand-portfolio', label: 'Grand Portfolio' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0c10] mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        {/* Logo + columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">DH</span>
              </div>
              <span className="text-sm font-semibold text-white">DataHeimdall</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
              Financial transparency data from public SEC filings.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/25">
          <span>© {new Date().getFullYear()} DataHeimdall. All rights reserved.</span>
          <span>Data sourced from SEC EDGAR public filings.</span>
        </div>
      </div>
    </footer>
  )
}
