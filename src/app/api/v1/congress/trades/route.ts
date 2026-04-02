import { successResponse } from '@/lib/api-response'

export const revalidate = 60


export function GET() {
  return successResponse([], {
    total: 0,
    page: 1,
    per_page: 50,
    last_updated: new Date().toISOString(),
  })
}
