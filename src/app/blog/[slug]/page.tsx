import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPostMetas, getPost, CATEGORY_LABELS } from '@/lib/blog'
import { formatDate } from '@/lib/formatters'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Blog – DataHeimdall' }

  const url = `https://dataheimdall.com/blog/${slug}`
  return {
    title: `${post.title} – DataHeimdall`,
    description: post.description || undefined,
    keywords: post.keywords.length > 0 ? post.keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description || undefined,
      url,
      type: 'article',
      publishedTime: post.date || undefined,
      authors: post.author ? [post.author] : undefined,
      images: post.ogImage ? [{ url: `https://dataheimdall.com${post.ogImage}` }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description || undefined,
      images: post.ogImage ? [`https://dataheimdall.com${post.ogImage}`] : [],
    },
  }
}

export async function generateStaticParams() {
  return getAllPostMetas().map((post) => ({ slug: post.slug }))
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  // Prev / next navigation (sorted newest-first, same as listing)
  const allPosts = getAllPostMetas()
  const index = allPosts.findIndex((p) => p.slug === slug)
  const prev = index < allPosts.length - 1 ? allPosts[index + 1] : null // older
  const next = index > 0 ? allPosts[index - 1] : null                   // newer

  // JSON-LD Article schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description || undefined,
    datePublished: post.date || undefined,
    dateModified: post.date || undefined,
    author: {
      '@type': 'Organization',
      name: post.author || 'DataHeimdall',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DataHeimdall',
      url: 'https://dataheimdall.com',
    },
    url: `https://dataheimdall.com/blog/${slug}`,
    ...(post.ogImage
      ? { image: `https://dataheimdall.com${post.ogImage}` }
      : {}),
    keywords: post.keywords.join(', ') || undefined,
  }

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ChevronLeft size={14} /> Back to Blog
        </Link>

        {/* Post header */}
        <header className="mb-10">
          {/* Category */}
          {post.category && (
            <Link
              href={`/blog?category=${post.category}`}
              className="inline-block mb-3 text-[11px] font-semibold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
            >
              {CATEGORY_LABELS[post.category] ?? post.category}
            </Link>
          )}

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40">
            {post.date && <span>{formatDate(post.date)}</span>}
            {post.author && (
              <>
                <span>·</span>
                <span>{post.author}</span>
              </>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} className="shrink-0" />
              {post.readingTime}
            </span>
          </div>
        </header>

        {/* MDX content */}
        <article className="prose prose-invert prose-sm max-w-none
          prose-headings:text-white prose-headings:font-semibold prose-headings:mt-8 prose-headings:mb-3
          prose-h2:text-xl prose-h3:text-base
          prose-p:text-white/70 prose-p:leading-relaxed prose-p:my-4
          prose-a:text-violet-400 prose-a:no-underline hover:prose-a:text-violet-300
          prose-strong:text-white
          prose-em:text-white/80
          prose-li:text-white/70 prose-li:my-1
          prose-ul:my-4 prose-ol:my-4
          prose-hr:border-white/10 prose-hr:my-8
          prose-code:text-white/80 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-normal
          prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg
          prose-blockquote:border-l-2 prose-blockquote:border-violet-500/50 prose-blockquote:text-white/50 prose-blockquote:pl-4 prose-blockquote:italic">
          <MDXRemote source={post.content} />
        </article>

        {/* Prev / Next navigation */}
        {(prev || next) && (
          <nav
            className="mt-16 pt-8 border-t border-white/8 grid grid-cols-1 sm:grid-cols-2 gap-4"
            aria-label="Post navigation"
          >
            {prev ? (
              <Link
                href={`/blog/${prev.slug}`}
                className="group flex flex-col gap-1 rounded-lg border border-white/8 bg-white/3 p-4 hover:border-white/15 transition-colors"
              >
                <span className="inline-flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors">
                  <ChevronLeft size={12} /> Previous
                </span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors leading-snug line-clamp-2">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                href={`/blog/${next.slug}`}
                className="group flex flex-col gap-1 rounded-lg border border-white/8 bg-white/3 p-4 hover:border-white/15 transition-colors sm:text-right"
              >
                <span className="inline-flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors sm:justify-end">
                  Next <ChevronRight size={12} />
                </span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors leading-snug line-clamp-2">
                  {next.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}
      </main>
    </>
  )
}
