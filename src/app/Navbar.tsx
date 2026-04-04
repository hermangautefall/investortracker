'use client';
import { T } from '@/components/ui/Typography';
import Link from 'next/link';

export const ExternalNavigation = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center">
        <Link className="flex items-center space-x-2" href="/">
          <T.H3 className="text-xl font-semibold leading-tight mt-0">
            [SITE NAME]
          </T.H3>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            href="/politicians"
          >
            Politicians
          </Link>
          <Link
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            href="/insiders"
          >
            Insiders
          </Link>
          <Link
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            href="/tickers/AAPL"
          >
            Tickers
          </Link>
        </nav>
      </div>
    </header>
  );
};
