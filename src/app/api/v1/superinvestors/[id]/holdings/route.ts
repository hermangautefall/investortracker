import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) return errorResponse('Invalid investor ID', 400)

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('per_page') ?? String(DEFAULT_PAGE_SIZE), 10))
  )
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = getAdminClient()

  // Determine quarter: use param or fall back to latest available
  let quarter = searchParams.get('quarter') ?? null
  if (!quarter) {
    const latestRes = await supabase
      .from('portfolio_holdings')
      .select('quarter')
      .eq('investor_id', id)
      .order('quarter', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestRes.error) return errorResponse(latestRes.error.message, 500)
    quarter = latestRes.data?.quarter ?? null
  }

  if (!quarter) {
    return successResponse([], {
      total: 0, page, per_page: perPage, last_updated: new Date().toISOString(),
    })
  }

  const { data, error, count } = await supabase
    .from('portfolio_holdings')
    .select(
      'id, ticker, company_name, shares, value_usd, portfolio_weight, quarter, filing_date, source',
      { count: 'exact' }
    )
    .eq('investor_id', id)
    .eq('quarter', quarter)
    .not('ticker', 'is', null)
    .order('portfolio_weight', { ascending: false })
    .range(from, to)

  if (error) return errorResponse(error.message, 500)

  return successResponse(data ?? [], {
    total: count ?? 0,
    page,
    per_page: perPage,
    last_updated: new Date().toISOString(),
  })
}
