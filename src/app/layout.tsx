import '@/styles/globals.css';
import localFont from 'next/font/local';
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
  description: 'DataHeimdall tracks SEC insider trades and superinvestor 13F portfolios — organized, searchable, and updated daily.',
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
        <div className="flex flex-col min-h-screen bg-[#0f1117] text-white">
          <Header />
          <ClientLayout>{children}</ClientLayout>
          <Footer />
        </div>
      </body>
    </html>
  );
}
