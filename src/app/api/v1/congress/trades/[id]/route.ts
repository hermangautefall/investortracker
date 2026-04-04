import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const revalidate = 60

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return errorResponse('Trade not found', 404)

  const { data, error } = await getAdminClient()
    .from('congress_trades')
    .select(
      `id, ticker, company_name, trade_type, amount_min, amount_max,
       trade_date, disclosure_date, filing_url, source,
       politicians(id, full_name, party, state, chamber)`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return errorResponse(error.message, 500)
  if (!data)  return errorResponse('Trade not found', 404)

  return successResponse(data, {
    total: 1,
    page: 1,
    per_page: 1,
    last_updated: new Date().toISOString(),
  })
}
