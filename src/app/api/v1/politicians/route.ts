import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants'

export const revalidate = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const chamber = searchParams.get('chamber')?.toLowerCase().trim()
  const party   = searchParams.get('party')?.trim()
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('per_page') ?? String(DEFAULT_PAGE_SIZE), 10)))

  const from = (page - 1) * perPage
  const to   = from + perPage - 1

  const supabase = getAdminClient()

  let query = supabase
    .from('politician_summary')
    .select('*', { count: 'exact' })
    .order('total_trades', { ascending: false })
    .range(from, to)

  if (chamber) query = query.eq('chamber', chamber)
  if (party)   query = query.ilike('party', party)

  const { data, count, error } = await query

  if (error) return errorResponse(error.message, 500)

  return successResponse(data ?? [], {
    total: count ?? 0,
    page,
    per_page: perPage,
    last_updated: new Date().toISOString(),
  })
}
