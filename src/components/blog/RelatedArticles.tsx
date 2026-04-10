import Link from 'next/link'
import { getAllPosts, CATEGORIES } from '@/lib/mdx'
import type { PostMeta } from '@/lib/mdx'

interface Props {
  currentSlug: string
  category: string
}

export function RelatedArticles({ currentSlug, category }: Props) {
  const all = getAllPosts()

  // First: same category (excluding current). Then fill with recent if needed.
  const sameCategory = all.filter(
    (p) => p.slug !== currentSlug && p.category === category,
  )
  const others = all.filter(
    (p) => p.slug !== currentSlug && p.category !== category,
  )

  const related: PostMeta[] = [
    ...sameCategory.slice(0, 3),
    ...others.slice(0, Math.max(0, 3 - sameCategory.length)),
  ].slice(0, 3)

  if (related.length === 0) return null

  const categoryLabel = CATEGORIES[category] ?? category

  return (
    <section
      aria-label="Related articles"
      className="mt-16 card-glow rounded-2xl bg-white/[0.03] p-6 sm:p-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-6">
        More on {categoryLabel}
      </p>

      <div className="flex flex-col divide-y divide-white/8">
        {related.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col gap-1 py-4 first:pt-0 last:pb-0"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
              {CATEGORIES[post.category] ?? post.category}
            </span>
            <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-snug">
              {post.title}
            </span>
            {post.description && (
              <span className="text-xs text-white/35 leading-relaxed line-clamp-2">
                {post.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
