import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

/**
 * Service-role Supabase client for server-side API routes.
 * Never import this in client components — the service role key is server-only.
 */
export function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
