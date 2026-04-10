import Link from 'next/link'
import { getAllPosts, CATEGORIES } from '@/lib/mdx'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — Insider Trading, 13F Filings & Congressional Trades | DataHeimdall',
  description:
    'Guides and analysis on SEC insider trading data, superinvestor 13F filings, and congressional stock disclosures. Learn how to use public financial data in your investment research.',
  alternates: { canonical: 'https://dataheimdall.com/blog' },
  openGraph: {
    title: 'Blog | DataHeimdall',
    description:
      'Guides on insider trading, 13F filings, and congressional stock disclosures.',
  },
}

export default function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const activeCategory = searchParams.category ?? 'all'
  const allPosts = getAllPosts()

  const filtered =
    activeCategory === 'all' || !CATEGORIES[activeCategory]
      ? allPosts
      : allPosts.filter((p) => p.category === activeCategory)

  // Category keys excluding 'all' — only show tabs with posts
  const categoriesWithAll = Object.keys(CATEGORIES)

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-3">
          Insights & Guides
        </p>
        <h1 className="text-3xl font-bold text-white mb-3 gradient-text">Blog</h1>
        <p className="text-sm text-white/40">
          Guides on insider trading, 13F filings, and congressional stock disclosures.
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-10">
        {categoriesWithAll.map((key) => {
          const isActive = key === activeCategory || (key === 'all' && !CATEGORIES[activeCategory])
          return (
            <Link
              key={key}
              href={key === 'all' ? '/blog' : `/blog?category=${key}`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/[0.06]'
              }`}
            >
              {CATEGORIES[key]}
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-16">
          No articles in this category yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map((post) => (
            <article key={post.slug} className="card-glow rounded-xl bg-white/[0.02] p-6 group">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                  {CATEGORIES[post.category] ?? post.category}
                </span>
                <span className="text-white/15">·</span>
                <span className="text-xs text-white/30">{post.readingTime}</span>
                <span className="text-white/15">·</span>
                {post.publishedAt && (
                  <time className="text-xs text-white/30" dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
              </div>

              <Link href={`/blog/${post.slug}`} className="block mb-2">
                <h2 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors leading-snug">
                  {post.title}
                </h2>
              </Link>

              <p className="text-sm text-white/45 leading-relaxed mb-4 max-w-2xl">
                {post.description}
              </p>

              <Link
                href={`/blog/${post.slug}`}
                className="text-xs text-violet-400/70 hover:text-violet-300 transition-colors"
              >
                Read article →
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
