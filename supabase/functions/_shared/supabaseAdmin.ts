import { createClient } from 'npm:@supabase/supabase-js@2';

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically injected
// into every Edge Function's environment by Supabase — no manual setup
// needed when deployed. The service role key bypasses RLS, which is why
// all authorization checks must happen in code (see auth.ts) before any
// write reaches the database.
export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
