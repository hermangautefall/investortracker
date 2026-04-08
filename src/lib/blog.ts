import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export type Category =
  | 'all'
  | 'insider-trading'
  | 'superinvestors'
  | 'congressional-trading'
  | 'strategy'

export const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  'insider-trading': 'Insider Trading',
  superinvestors: 'Superinvestors',
  'congressional-trading': 'Congressional Trading',
  strategy: 'Strategy',
}

export type PostMeta = {
  slug: string
  title: string
  date: string          // normalised — always present (publishedAt or date)
  description: string
  author: string
  category: Category | null
  keywords: string[]
  ogImage: string | null
  readingTime: string   // e.g. "7 min read"
}

export type Post = PostMeta & {
  content: string
}

function normalise(data: Record<string, unknown>, content: string): Omit<PostMeta, 'slug'> {
  const date = ((data.publishedAt ?? data.date ?? '') as string)
  const rtResult = readingTime(content)
  const minutes = Math.max(1, Math.ceil(rtResult.minutes))

  return {
    title: (data.title as string) ?? '',
    date,
    description: (data.description as string) ?? '',
    author: (data.author as string) ?? '',
    category: (data.category as Category) ?? null,
    keywords: Array.isArray(data.keywords) ? (data.keywords as string[]) : [],
    ogImage: (data.ogImage as string) ?? null,
    readingTime: `${minutes} min read`,
  }
}

export function getAllPostMetas(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .map((filename) => {
      const slug = filename.replace(/\.(mdx|md)$/, '')
      const fullPath = path.join(BLOG_DIR, filename)
      const raw = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(raw)
      return { slug, ...normalise(data, content) }
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}

export function getPost(slug: string): Post | null {
  for (const ext of ['mdx', 'md']) {
    const fullPath = path.join(BLOG_DIR, `${slug}.${ext}`)
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(raw)
      return { slug, ...normalise(data, content), content }
    }
  }
  return null
}
