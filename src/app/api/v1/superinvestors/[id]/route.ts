import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const revalidate = 300

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) return errorResponse('Invalid investor ID', 400)

  const supabase = getAdminClient()

  const [investorRes, holdingsRes] = await Promise.all([
    supabase
      .from('superinvestors')
      .select('id, name, fund_name, cik')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('portfolio_holdings')
      .select('ticker, company_name, shares, value_usd, portfolio_weight, quarter')
      .eq('investor_id', id),
  ])

  if (investorRes.error) return errorResponse(investorRes.error.message, 500)
  if (!investorRes.data)  return errorResponse('Investor not found', 404)
  if (holdingsRes.error)  return errorResponse(holdingsRes.error.message, 500)

  const holdings = holdingsRes.data ?? []

  // Derive available quarters + latest
  const quartersSet = new Set(holdings.map((h) => h.quarter).filter((q): q is string => q != null))
  const quarters = Array.from(quartersSet).sort().reverse()
  const latestQuarter = quarters[0] ?? null

  // Top 10 by portfolio_weight in latest quarter
  const latestHoldings = holdings
    .filter((h) => h.quarter === latestQuarter && h.ticker)
    .sort((a, b) => (b.portfolio_weight ?? 0) - (a.portfolio_weight ?? 0))
    .slice(0, 10)

  const data = {
    ...investorRes.data,
    latest_quarter: latestQuarter,
    holdings_count: new Set(holdings.filter((h) => h.ticker).map((h) => h.ticker as string)).size,
    quarters_available: quarters,
    top_holdings: latestHoldings,
  }

  return successResponse(data, {
    total: 1,
    page: 1,
    per_page: 1,
    last_updated: new Date().toISOString(),
  })
}
