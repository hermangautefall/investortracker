import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getPostBySlug, getAllPostSlugs, getAdjacentPosts, CATEGORIES } from '@/lib/mdx'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 3600

// ---------------------------------------------------------------------------
// Static params & metadata
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: 'Blog – DataHeimdall' }

  const url = `https://dataheimdall.com/blog/${post.slug}`
  const ogUrl = `https://dataheimdall.com${post.ogImage}`

  return {
    title: `${post.title} | DataHeimdall`,
    description: post.description || undefined,
    keywords: post.keywords.length > 0 ? post.keywords : undefined,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description || undefined,
      url,
      type: 'article',
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: [post.author],
      images: [{ url: ogUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description || undefined,
      images: [ogUrl],
    },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const { prev, next } = getAdjacentPosts(slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || undefined,
    author: {
      '@type': 'Organization',
      name: post.author || 'DataHeimdall',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DataHeimdall',
      url: 'https://dataheimdall.com',
    },
    url: `https://dataheimdall.com/blog/${post.slug}`,
    image: `https://dataheimdall.com${post.ogImage}`,
    keywords: post.keywords.join(', ') || undefined,
    articleSection: CATEGORIES[post.category] ?? post.category,
    inLanguage: 'en-US',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-white/30 mb-8" aria-label="Breadcrumb">
          <Link href="/blog" className="hover:text-white/60 transition-colors">
            Blog
          </Link>
          <span>›</span>
          <span className="text-white/50">
            {CATEGORIES[post.category] ?? post.category}
          </span>
        </nav>

        {/* Article header */}
        <header className="mb-10">
          {/* Category */}
          <Link
            href={`/blog?category=${post.category}`}
            className="inline-block mb-3 text-[11px] font-semibold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
          >
            {CATEGORIES[post.category] ?? post.category}
          </Link>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            {post.title}
          </h1>

          {post.description && (
            <p className="text-lg text-white/50 leading-relaxed mb-5">
              {post.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/30">
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
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

        {/* Article body — wysiwyg = Tailwind v4 typography plugin classname */}
        <article className="wysiwyg wysiwyg-invert wysiwyg-sm max-w-none
          wysiwyg-headings:text-white wysiwyg-headings:font-semibold wysiwyg-headings:mt-8 wysiwyg-headings:mb-3
          wysiwyg-h2:text-xl wysiwyg-h3:text-base
          wysiwyg-p:text-white/70 wysiwyg-p:leading-relaxed wysiwyg-p:my-4
          wysiwyg-a:text-violet-400 wysiwyg-a:no-underline hover:wysiwyg-a:text-violet-300
          wysiwyg-strong:text-white
          wysiwyg-em:text-white/80
          wysiwyg-li:text-white/70 wysiwyg-li:my-1
          wysiwyg-ul:my-4 wysiwyg-ol:my-4
          wysiwyg-hr:border-white/10 wysiwyg-hr:my-8
          wysiwyg-code:text-white/80 wysiwyg-code:bg-white/5 wysiwyg-code:px-1.5 wysiwyg-code:py-0.5 wysiwyg-code:rounded wysiwyg-code:text-[13px]
          wysiwyg-pre:bg-white/5 wysiwyg-pre:border wysiwyg-pre:border-white/10 wysiwyg-pre:rounded-lg
          wysiwyg-blockquote:border-l-2 wysiwyg-blockquote:border-violet-500/50 wysiwyg-blockquote:text-white/50 wysiwyg-blockquote:pl-4 wysiwyg-blockquote:italic
          wysiwyg-table:text-sm wysiwyg-th:text-white/60 wysiwyg-td:text-white/50">
          <MDXRemote source={post.content} />
        </article>

        {/* Last updated note */}
        {post.updatedAt && post.updatedAt !== post.publishedAt && (
          <p className="text-sm text-white/25 mt-8 pt-8 border-t border-white/8">
            Last updated{' '}
            <time dateTime={post.updatedAt}>
              {new Date(post.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </p>
        )}

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

        {/* Back link */}
        <div className="mt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            <ChevronLeft size={14} /> All articles
          </Link>
        </div>

      </main>
    </>
  )
}
