import { getHomepageData } from '@/lib/homepage-data'

export const revalidate = 300

export async function GET() {
  try {
    const data = await getHomepageData()
    return Response.json(data)
  } catch (err) {
    console.error('homepage-data API error:', err)
    return Response.json({ error: 'Failed to load homepage data' }, { status: 500 })
  }
}
