import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const revalidate = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!UUID_RE.test(id)) return errorResponse('Insider not found', 404)

  const { data, error } = await getAdminClient()
    .from('insiders')
    .select('id, name, cik, primary_role, primary_company')
    .eq('id', id)
    .maybeSingle()

  if (error) return errorResponse(error.message, 500)
  if (!data) return errorResponse('Insider not found', 404)

  return successResponse(data, {
    total: 1,
    page: 1,
    per_page: 1,
    last_updated: new Date().toISOString(),
  })
}
