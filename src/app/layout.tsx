import '@/styles/globals.css';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ClientLayout } from './ClientLayout';

const inter = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const roboto_mono = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'DataHeimdall',
    template: '%s | DataHeimdall',
  },
  description:
    'Track superinvestor portfolios, SEC Form 4 insider trades, and congressional stock disclosures. Real-time financial transparency data.',
  keywords: [
    'insider trading',
    'superinvestors',
    '13F filings',
    'SEC Form 4',
    'stock disclosure',
    'Warren Buffett portfolio',
    'congressional trades',
    'value investing',
  ],
  metadataBase: new URL('https://dataheimdall.com'),
  openGraph: {
    type: 'website',
    siteName: 'DataHeimdall',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@dataheimdall',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto_mono.variable} dark`}>
      <head />
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'DataHeimdall',
              url: 'https://dataheimdall.com',
              description: 'Track superinvestor portfolios and SEC insider trades',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://dataheimdall.com/insiders?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        <div className="flex flex-col min-h-screen bg-[#0f1117] text-white">
          <Header />
          <ClientLayout>{children}</ClientLayout>
          <Footer />
        </div>
      </body>
    </html>
  );
}
