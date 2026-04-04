'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '/insiders', label: 'Insider Trades' },
  { href: '/politicians', label: 'Politicians' },
  { href: '/grand-portfolio', label: 'Grand Portfolio' },
  { href: null, label: 'Super Investors', disabled: true },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0f1117]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
          [SITE NAME]
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {NAV_LINKS.map((link) =>
            link.disabled || !link.href ? (
              <span
                key={link.label}
                className="text-sm text-white/25 cursor-not-allowed select-none"
              >
                {link.label}
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'text-white font-medium'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-1 text-white/60 hover:text-white transition-colors"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/8 bg-[#0f1117]">
          <nav className="px-4 py-3 flex flex-col gap-3">
            {NAV_LINKS.map((link) =>
              link.disabled || !link.href ? (
                <span key={link.label} className="text-sm text-white/25 cursor-not-allowed">
                  {link.label}
                </span>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm transition-colors ${
                    pathname.startsWith(link.href)
                      ? 'text-white font-medium'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
