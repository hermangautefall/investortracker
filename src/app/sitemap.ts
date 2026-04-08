import type { MetadataRoute } from 'next'
import { getAdminClient } from '@/lib/supabase-admin'
import { getAllPostMetas } from '@/lib/blog'

const BASE_URL = 'https://dataheimdall.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getAdminClient()

  const [investorsRes, insidersRes, tickersRes] = await Promise.all([
    supabase.from('superinvestors').select('id'),
    supabase.from('insiders').select('id'),
    supabase.from('ticker_activity_summary').select('ticker'),
  ])

  const posts = getAllPostMetas()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/insiders`,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/superinvestors`,            lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/grand-portfolio`,           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/superinvestor-consensus`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/blog`,                      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE_URL}/about`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/disclaimer`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const investorRoutes: MetadataRoute.Sitemap = (investorsRes.data ?? []).map((inv) => ({
    url: `${BASE_URL}/superinvestors/${inv.id}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const insiderRoutes: MetadataRoute.Sitemap = (insidersRes.data ?? []).map((ins) => ({
    url: `${BASE_URL}/insiders/${ins.id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const tickerRoutes: MetadataRoute.Sitemap = (tickersRes.data ?? [])
    .filter((r): r is { ticker: string } => r.ticker != null)
    .map((r) => ({
      url: `${BASE_URL}/tickers/${r.ticker}`,
      changeFrequency: 'daily',
      priority: 0.6,
    }))

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...investorRoutes, ...insiderRoutes, ...tickerRoutes, ...blogRoutes]
}
