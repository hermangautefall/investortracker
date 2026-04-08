import Link from 'next/link'
import { getAllPostMetas } from '@/lib/blog'
import { formatDate } from '@/lib/formatters'

export const revalidate = 3600

export const metadata = {
  title: 'Blog – DataHeimdall',
  description: 'Insights on value investing, superinvestor portfolios, and financial transparency data.',
  alternates: { canonical: 'https://dataheimdall.com/blog' },
}

export default function BlogPage() {
  const posts = getAllPostMetas()

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
      <p className="text-sm text-white/40 mb-10">Updates, insights, and announcements.</p>

      {posts.length === 0 ? (
        <p className="text-white/40 text-sm">No posts yet.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border border-white/8 bg-white/3 p-6 hover:border-white/15 transition-colors"
            >
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="text-lg font-semibold text-white group-hover:text-white/80 transition-colors mb-1">
                  {post.title}
                </h2>
                {post.description && (
                  <p className="text-sm text-white/50 mb-3 leading-relaxed">
                    {post.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-white/30">
                  {post.date && <span>{formatDate(post.date)}</span>}
                  {post.author && (
                    <>
                      <span>·</span>
                      <span>{post.author}</span>
                    </>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
