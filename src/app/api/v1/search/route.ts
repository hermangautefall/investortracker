import { getAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 2) {
    return Response.json({ insiders: [], superinvestors: [], stocks: [] })
  }

  const supabase = getAdminClient()
  const pattern = `%${q}%`

  const [insidersRes, superRes, stocksRes] = await Promise.all([
    supabase
      .from('insiders')
      .select('id, name, primary_role, primary_company')
      .ilike('name', pattern)
      .limit(4),
    supabase
      .from('superinvestors')
      .select('id, name, fund_name')
      .or(`name.ilike.${pattern},fund_name.ilike.${pattern}`)
      .limit(4),
    supabase
      .from('ticker_activity_summary')
      .select('ticker, company_name')
      .or(`ticker.ilike.${pattern},company_name.ilike.${pattern}`)
      .limit(4),
  ])

  return Response.json({
    insiders: insidersRes.data ?? [],
    superinvestors: superRes.data ?? [],
    stocks: stocksRes.data ?? [],
  })
}
