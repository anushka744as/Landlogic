import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthResult {
  user: { id: string; email: string | null; isAdmin: boolean } | null;
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

  const isAdmin = data.user.app_metadata?.role === 'admin';
  return { user: { id: data.user.id, email: data.user.email ?? null, isAdmin }, error: null };
}

/**
 * Like requireUser, but also rejects any signed-in user who isn't flagged
 * as admin (via app_metadata.role = 'admin', set server-side — regular
 * sign-ups can never set this themselves). Use this for all listing
 * create/update/delete endpoints so only the admin account can manage data.
 */
export async function requireAdmin(
  req: Request,
  admin: SupabaseClient,
): Promise<AuthResult> {
  const result = await requireUser(req, admin);
  if (!result.user) return result;
  if (!result.user.isAdmin) {
    return { user: null, error: 'Admin access required.' };
  }
  return result;
}