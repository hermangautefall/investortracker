import { successResponse } from '@/lib/api-response'

export const revalidate = 0

export function GET() {
  return successResponse({ status: 'ok' }, {
    total: 0,
    page: 1,
    per_page: 50,
    last_updated: new Date().toISOString(),
  })
}
