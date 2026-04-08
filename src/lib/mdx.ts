import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORIES: Record<string, string> = {
  all: 'All',
  'insider-trading': 'Insider Trading',
  superinvestors: 'Superinvestors',
  'congressional-trading': 'Congressional Trading',
  strategy: 'Strategy',
  education: 'Education',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostMeta {
  title: string
  description: string
  publishedAt: string  // normalised from publishedAt or date
  updatedAt: string
  slug: string
  category: string
  keywords: string[]
  readingTime: string
  ogImage: string
  author: string
  excerpt: string
}

export interface Post extends PostMeta {
  content: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildMeta(slug: string, data: Record<string, unknown>, content: string): PostMeta {
  const rtResult = readingTime(content)
  const minutes = Math.max(1, Math.ceil(rtResult.minutes))

  // Normalise publishedAt — frontmatter may use either publishedAt or date
  const publishedAt = ((data.publishedAt ?? data.date ?? '') as string)
  const updatedAt = ((data.updatedAt ?? data.publishedAt ?? data.date ?? '') as string)

  // Plain-text excerpt from the first 200 chars of content
  const excerpt =
    content
      .slice(0, 250)
      .replace(/[#*`\[\]>]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200) + '…'

  return {
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    publishedAt,
    updatedAt,
    slug: (data.slug as string) ?? slug,
    category: (data.category as string) ?? 'education',
    keywords: Array.isArray(data.keywords) ? (data.keywords as string[]) : [],
    readingTime: `${minutes} min read`,
    ogImage: (data.ogImage as string) ?? '/og/default.png',
    author: (data.author as string) ?? 'Editorial Team',
    excerpt,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''))
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  return getAllPostSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.mdx`), 'utf8')
      const { data, content } = matter(raw)
      return buildMeta(slug, data, content)
    })
    // Skip unfilled template files (title contains "[" placeholder)
    .filter((p) => !p.title.includes('['))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const meta = buildMeta(slug, data, content)
  if (meta.title.includes('[')) return null // template — not ready
  return { ...meta, content }
}

export function getAdjacentPosts(slug: string): {
  prev: PostMeta | null
  next: PostMeta | null
} {
  const all = getAllPosts()
  const index = all.findIndex((p) => p.slug === slug)
  return {
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  }
}
