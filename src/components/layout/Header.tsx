'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { GlobalSearch } from '@/components/search/GlobalSearch'

const NAV_LINKS = [
  { href: '/insiders', label: 'Insider Trades' },
  /* HIDDEN: congress data pending FMP activation */
  // { href: '/politicians', label: 'Politicians' },
  { href: '/superinvestors', label: 'Superinvestors' },
  { href: '/grand-portfolio', label: 'Grand Portfolio' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0f1117]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="text-sm font-semibold text-white hover:text-white/80 transition-colors shrink-0">
          [SITE NAME]
        </Link>

        {/* Search — desktop: centered, mobile: hidden (shown below) */}
        <div className="hidden sm:flex flex-1 justify-center">
          <GlobalSearch />
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6 shrink-0">
          {NAV_LINKS.map((link) => (
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
          ))}
        </nav>

        {/* Mobile hamburger — Sheet slides in from right */}
        <div className="sm:hidden ml-auto">
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="p-1 text-white/60 hover:text-white transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-[#0f1117] border-white/8 w-64 p-0"
            >
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/8">
                <SheetTitle className="text-sm font-semibold text-white text-left">
                  [SITE NAME]
                </SheetTitle>
              </SheetHeader>
              <nav className="px-6 py-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className={`py-2 text-sm transition-colors ${
                        pathname.startsWith(link.href)
                          ? 'text-white font-medium'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile search — full-width row below the header bar */}
      <div className="sm:hidden border-t border-white/5 px-4 py-2">
        <GlobalSearch />
      </div>
    </header>
  )
}
