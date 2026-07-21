/*
# Secure properties table for the new backend API layer

## Purpose
Previously `anon` and `authenticated` roles could INSERT/UPDATE/DELETE
directly against `properties` from the browser. Now that a proper backend
(Supabase Edge Functions) sits in front of the database, direct client
writes are removed. All writes must go through the Edge Function API,
which verifies a Supabase Auth session and uses the service-role key
(which bypasses RLS entirely) to perform the mutation.

## Changes
1. Drop the old open insert/update/delete policies (`anon`/`authenticated`).
2. Keep public SELECT (the listings site is intentionally read-public).
3. No authenticated write policy is (re)added on purpose — writes only
   ever happen via the service-role client inside Edge Functions, after
   the function itself has validated the caller's JWT. This means even a
   logged-in user's browser session cannot write straight to PostgREST;
   it must call our `/properties` Edge Function.
*/

DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
DROP POLICY IF EXISTS "anon_update_properties" ON properties;
DROP POLICY IF EXISTS "anon_delete_properties" ON properties;

-- Select stays public (read-only listings site).
DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "public_select_properties" ON properties FOR SELECT
  TO anon, authenticated USING (true);
