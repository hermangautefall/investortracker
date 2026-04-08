import { NextConfig } from "next";

const config: NextConfig = {
  cacheComponents: false,

  async redirects() {
    return [
      // Blog articles link to /insider-trades; the actual page lives at /insiders
      {
        source: '/insider-trades',
        destination: '/insiders',
        permanent: true,
      },
    ]
  },

  async rewrites() {
    return [
      // Serve /og/default.png as fallback for any missing OG image
      {
        source: '/og/:path*',
        destination: '/og/default.png',
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};


export default config;
