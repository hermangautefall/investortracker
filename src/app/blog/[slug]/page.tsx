import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPostMetas, getPost } from '@/lib/blog'
import { formatDate } from '@/lib/formatters'
import { ChevronLeft } from 'lucide-react'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Blog Post' }
  return {
    title: post.title,
    description: post.description || undefined,
    alternates: { canonical: `https://dataheimdall.com/blog/${slug}` },
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

  return (
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
        <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-white/40">
          {post.date && <span>{formatDate(post.date)}</span>}
          {post.author && (
            <>
              <span>·</span>
              <span>{post.author}</span>
            </>
          )}
        </div>
      </header>

      {/* MDX content */}
      <article className="prose prose-invert prose-sm max-w-none
        prose-headings:text-white prose-headings:font-semibold
        prose-p:text-white/70 prose-p:leading-relaxed
        prose-a:text-white prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-white/70
        prose-strong:text-white
        prose-li:text-white/70
        prose-ul:text-white/70
        prose-hr:border-white/10
        prose-code:text-white/80 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        prose-blockquote:border-white/20 prose-blockquote:text-white/50">
        <MDXRemote source={post.content} />
      </article>
    </main>
  )
}
