export interface Meta {
  total: number
  page: number
  per_page: number
  last_updated: string
}

export function successResponse(data: unknown, meta: Meta) {
  return Response.json({ data, meta })
}

export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}
