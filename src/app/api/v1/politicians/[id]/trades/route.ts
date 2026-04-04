import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants'

export const revalidate = 60

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)

  const ticker  = searchParams.get('ticker')?.toUpperCase().trim()
  const type    = searchParams.get('type')?.trim()
  const days    = searchParams.get('days')
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('per_page') ?? String(DEFAULT_PAGE_SIZE), 10)))

  const from = (page - 1) * perPage
  const to   = from + perPage - 1

  const supabase = getAdminClient()

  let query = supabase
    .from('congress_trades')
    .select(
      `id, ticker, company_name, trade_type, amount_min, amount_max,
       trade_date, disclosure_date, filing_url, source,
       politicians(id, full_name, party, state, chamber)`,
      { count: 'exact' }
    )
    .eq('politician_id', id)
    .order('trade_date', { ascending: false })
    .range(from, to)

  if (ticker) query = query.eq('ticker', ticker)
  if (type)   query = query.eq('trade_type', type)

  if (days) {
    const n = parseInt(days, 10)
    if (isNaN(n) || n < 1) return errorResponse('days must be a positive integer')
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - n)
    query = query.gte('trade_date', cutoff.toISOString().slice(0, 10))
  }

  const { data, count, error } = await query

  if (error) return errorResponse(error.message, 500)

  return successResponse(data ?? [], {
    total: count ?? 0,
    page,
    per_page: perPage,
    last_updated: new Date().toISOString(),
  })
}
