import { T } from '@/components/ui/Typography';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-muted/50 py-8">
      <div className="container mx-auto px-4 md:px-6">
        <Separator className="mb-6" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <T.Small className="text-muted-foreground">
            © {new Date().getFullYear()} InvestorTracker. All Rights Reserved.
          </T.Small>
          <nav className="flex items-center gap-4">
            <Link
              href="/politicians"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Politicians
            </Link>
            <Link
              href="/insiders"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Insiders
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
