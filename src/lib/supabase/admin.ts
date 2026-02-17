import { createClient } from '@supabase/supabase-js'

// Admin client with service role - bypasses RLS
// ONLY use this for admin-only server-side operations
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
