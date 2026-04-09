import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeSlug from 'rehype-slug'
import { getPostBySlug, getAllPostSlugs, getAdjacentPosts, CATEGORIES } from '@/lib/mdx'
import { extractHeadings } from '@/lib/toc'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { RelatedArticles } from '@/components/blog/RelatedArticles'
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
  const headings = extractHeadings(post.content)

  // JSON-LD Article schema
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-white/30 mb-10" aria-label="Breadcrumb">
          <Link href="/blog" className="hover:text-white/60 transition-colors">
            Blog
          </Link>
          <span>›</span>
          <Link
            href={`/blog?category=${post.category}`}
            className="hover:text-white/60 transition-colors"
          >
            {CATEGORIES[post.category] ?? post.category}
          </Link>
        </nav>

        {/* Two-column layout: TOC (left/sidebar) + article (right/main) */}
        <div className="flex gap-12 items-start">

          {/* ── TOC sidebar — left, sticky ── */}
          <aside className="hidden xl:block w-56 shrink-0">
            <div className="sticky top-24">
              {headings.length > 2 && (
                <TableOfContents headings={headings} />
              )}
            </div>
          </aside>

          {/* ── Main column ── */}
          <main className="min-w-0 w-full max-w-2xl">

            {/* Article header */}
            <header className="mb-12">
              <Link
                href={`/blog?category=${post.category}`}
                className="inline-block mb-4 text-[11px] font-semibold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
              >
                {CATEGORIES[post.category] ?? post.category}
              </Link>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight tracking-tight">
                {post.title}
              </h1>

              {post.description && (
                <p className="text-lg text-white/50 leading-relaxed mb-6">
                  {post.description}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/30 pt-5 border-t border-white/8">
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
                    <span className="text-white/15">·</span>
                    <span>{post.author}</span>
                  </>
                )}
                <span className="text-white/15">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} className="shrink-0" />
                  {post.readingTime}
                </span>
              </div>
            </header>

            {/* Article body */}
            {/*
              Tailwind v4 uses "wysiwyg" (custom classname from globals.css @plugin).
              We style headings, paragraphs, links, lists, code, blockquotes, tables.
            */}
            <article
              className="
                wysiwyg wysiwyg-invert max-w-none

                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:leading-tight [&_h2]:tracking-tight
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white/90 [&_h3]:mt-10 [&_h3]:mb-4 [&_h3]:leading-snug
                [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-white/80 [&_h4]:mt-8 [&_h4]:mb-3

                [&_p]:text-white/65 [&_p]:leading-[1.85] [&_p]:text-base [&_p]:my-5

                [&_a]:text-violet-400 [&_a]:no-underline [&_a:hover]:text-violet-300 [&_a:hover]:underline [&_a]:transition-colors

                [&_strong]:text-white [&_strong]:font-semibold
                [&_em]:text-white/75

                [&_ul]:my-6 [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:list-disc [&_ul>li]:text-white/65 [&_ul>li]:leading-relaxed [&_ul>li]:marker:text-violet-500/60
                [&_ol]:my-6 [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li]:text-white/65 [&_ol>li]:leading-relaxed

                [&_hr]:border-white/8 [&_hr]:my-12

                [&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/40 [&_blockquote]:pl-5 [&_blockquote]:py-1 [&_blockquote]:my-8 [&_blockquote]:italic [&_blockquote]:text-white/45 [&_blockquote]:text-base [&_blockquote]:leading-relaxed

                [&_code]:text-violet-300 [&_code]:bg-white/6 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono
                [&_pre]:bg-white/5 [&_pre]:border [&_pre]:border-white/8 [&_pre]:rounded-xl [&_pre]:p-5 [&_pre]:my-8 [&_pre]:overflow-x-auto

                [&_table]:w-full [&_table]:my-8 [&_table]:text-sm [&_table]:border-collapse
                [&_th]:text-left [&_th]:text-white/50 [&_th]:font-semibold [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_th]:pb-3 [&_th]:border-b [&_th]:border-white/10
                [&_td]:py-3 [&_td]:text-white/60 [&_td]:border-b [&_td]:border-white/6 [&_td]:leading-relaxed

                [&_img]:rounded-xl [&_img]:my-8 [&_img]:w-full
              "
            >
              <MDXRemote
                source={post.content}
                options={{
                  mdxOptions: {
                    rehypePlugins: [rehypeSlug],
                  },
                }}
              />
            </article>

            {/* Last updated */}
            {post.updatedAt && post.updatedAt !== post.publishedAt && (
              <p className="text-sm text-white/25 mt-12 pt-8 border-t border-white/8">
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

            {/* Related articles */}
            <RelatedArticles currentSlug={post.slug} category={post.category} />

            {/* Prev / Next navigation */}
            {(prev || next) && (
              <nav
                className="mt-10 pt-8 border-t border-white/8 grid grid-cols-1 sm:grid-cols-2 gap-4"
                aria-label="Post navigation"
              >
                {prev ? (
                  <Link
                    href={`/blog/${prev.slug}`}
                    className="group flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/3 p-5 hover:border-white/15 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors">
                      <ChevronLeft size={12} /> Previous article
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
                    className="group flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/3 p-5 hover:border-white/15 transition-colors sm:text-right"
                  >
                    <span className="inline-flex items-center gap-1 text-xs text-white/30 group-hover:text-white/50 transition-colors sm:justify-end">
                      Next article <ChevronRight size={12} />
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
            <div className="mt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                <ChevronLeft size={14} /> All articles
              </Link>
            </div>
          </main>

        </div>
      </div>
    </>
  )
}
