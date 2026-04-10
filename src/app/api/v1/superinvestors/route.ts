import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const revalidate = 300

export async function GET() {
  try {
    const supabase = getAdminClient()

    // Fetch all investors + their holdings summary in parallel
    const [investorsRes, holdingsRes] = await Promise.all([
      supabase.from('superinvestors').select('id, name, fund_name, cik'),
      supabase
        .from('portfolio_holdings')
        .select('investor_id, ticker, value_usd, quarter')
        .limit(50000),
    ])

    if (investorsRes.error) return errorResponse(investorsRes.error.message, 500)
    if (holdingsRes.error)  return errorResponse(holdingsRes.error.message, 500)

    // Aggregate in JS (Supabase JS doesn't expose GROUP BY + SUM + COUNT DISTINCT)
    type HoldingSummary = {
      tickers: Set<string>
      total_aum_usd: number
      latest_quarter: string | null
    }
    const summaryMap = new Map<string, HoldingSummary>()
    for (const h of holdingsRes.data ?? []) {
      if (!h.investor_id) continue
      if (!summaryMap.has(h.investor_id)) {
        summaryMap.set(h.investor_id, { tickers: new Set(), total_aum_usd: 0, latest_quarter: null })
      }
      const s = summaryMap.get(h.investor_id)!
      if (h.ticker) s.tickers.add(h.ticker)
      s.total_aum_usd += h.value_usd ?? 0
      if (!s.latest_quarter || (h.quarter && h.quarter > s.latest_quarter)) {
        s.latest_quarter = h.quarter
      }
    }

    const data = (investorsRes.data ?? [])
      .map((si) => {
        const s = summaryMap.get(si.id)
        return {
          id: si.id,
          name: si.name,
          fund_name: si.fund_name,
          cik: si.cik,
          holdings_count: s ? s.tickers.size : 0,
          total_aum_usd: s ? s.total_aum_usd : 0,
          latest_quarter: s?.latest_quarter ?? null,
        }
      })
      .sort((a, b) => b.total_aum_usd - a.total_aum_usd)

    return successResponse(data, {
      total: data.length,
      page: 1,
      per_page: data.length,
      last_updated: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Superinvestors list query failed:', e)
    return errorResponse('Internal server error', 500)
  }
}
