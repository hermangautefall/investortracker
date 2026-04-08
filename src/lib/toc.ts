export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

/**
 * Generates the same slug that rehype-slug produces.
 * rehype-slug uses github-slugger which:
 *   - lowercases, removes punctuation, replaces spaces with dashes
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars (keeps hyphens)
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Parse h2 and h3 headings from raw MDX source.
 * Returns them in document order.
 */
export function extractHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = []
  const seen: Record<string, number> = {}

  for (const line of content.split('\n')) {
    const m2 = line.match(/^## (.+)/)
    const m3 = line.match(/^### (.+)/)
    const match = m2 ?? m3
    if (!match) continue

    const text = match[1].trim()
    let id = slugify(text)

    // Deduplicate: github-slugger appends -1, -2 for repeated headings
    if (seen[id] !== undefined) {
      seen[id]++
      id = `${id}-${seen[id]}`
    } else {
      seen[id] = 0
    }

    headings.push({ id, text, level: m2 ? 2 : 3 })
  }

  return headings
}
