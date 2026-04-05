import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export type PostMeta = {
  slug: string
  title: string
  date: string
  description: string
  author: string
}

export type Post = PostMeta & {
  content: string
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
      const { data } = matter(raw)
      return {
        slug,
        title: (data.title as string) ?? slug,
        date: (data.date as string) ?? '',
        description: (data.description as string) ?? '',
        author: (data.author as string) ?? '',
      }
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}

export function getPost(slug: string): Post | null {
  const extensions = ['mdx', 'md']
  for (const ext of extensions) {
    const fullPath = path.join(BLOG_DIR, `${slug}.${ext}`)
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(raw)
      return {
        slug,
        title: (data.title as string) ?? slug,
        date: (data.date as string) ?? '',
        description: (data.description as string) ?? '',
        author: (data.author as string) ?? '',
        content,
      }
    }
  }
  return null
}
