import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { href: '/insiders', label: 'Insider Trades' },
      { href: '/politicians', label: 'Politicians' },
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
    <footer className="border-t border-white/8 bg-[#0f1117] mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Three-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-10">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-white/8 mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/30">
          <span>© {new Date().getFullYear()} [SITE NAME]. All rights reserved.</span>
          <span>Data sourced from SEC EDGAR public filings.</span>
        </div>
      </div>
    </footer>
  )
}
