import type { MetadataRoute } from 'next'
import { getAdminClient } from '@/lib/supabase-admin'
import { getAllPosts } from '@/lib/mdx'
import { getAllStockTickers } from '@/lib/stocks'

const BASE_URL = 'https://dataheimdall.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getAdminClient()

  const [investorsRes, insidersRes, tickersRes, allStockTickers] = await Promise.all([
    supabase.from('superinvestors').select('id'),
    supabase.from('insiders').select('id'),
    supabase.from('ticker_activity_summary').select('ticker'),
    getAllStockTickers(),
  ])

  const posts = getAllPosts()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/stocks`,                   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
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
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const stockRoutes: MetadataRoute.Sitemap = allStockTickers.map((ticker) => ({
    url: `${BASE_URL}/stocks/${ticker}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...investorRoutes, ...insiderRoutes, ...tickerRoutes, ...blogRoutes, ...stockRoutes]
}
