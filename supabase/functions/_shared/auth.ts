import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface AuthResult {
  user: { id: string; email: string | null } | null;
  error: string | null;
}

/**
 * Verifies the Authorization: Bearer <access_token> header against
 * Supabase Auth. Returns the authenticated user, or an error message.
 *
 * This is what stands in for "real auth" on write endpoints: a request
 * must carry a valid session token issued by supabase.auth.signInWithPassword
 * (or signUp) on the frontend. Anonymous requests are rejected for any
 * mutating operation.
 */
export async function requireUser(
  req: Request,
  admin: SupabaseClient,
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { user: null, error: 'Missing Authorization bearer token.' };
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired session.' };
  }

  return { user: { id: data.user.id, email: data.user.email ?? null }, error: null };
}
