// GET    /properties            -> list, with search/filter/sort/pagination
// GET    /properties/:id         -> single property
// POST   /properties             -> create (auth required)
// PATCH  /properties/:id         -> update (auth required)
// DELETE /properties/:id         -> delete (auth required)

// Use a std version compatible with the runtime/type declarations to avoid
// "Cannot find module" errors when resolving remote types.
import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';
import { handleOptions, json, errorResponse } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabaseAdmin.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { propertyCreateSchema, propertyUpdateSchema } from '../_shared/validation.ts';

const ALLOWED_SORT = new Set([
  'distance', 'price_asc', 'price_desc', 'value_desc', 'newest', 'oldest',
]);

serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const admin = getAdminClient();
  const url = new URL(req.url);
  // Path looks like /properties or /properties/<id>
  const segments = url.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('properties');
  const id = idx >= 0 ? segments[idx + 1] : undefined;

  try {
    if (req.method === 'GET' && !id) return await listProperties(admin, url);
    if (req.method === 'GET' && id) return await getProperty(admin, id);
    if (req.method === 'POST' && !id) return await createProperty(req, admin);
    if (req.method === 'PATCH' && id) return await updateProperty(req, admin, id);
    if (req.method === 'DELETE' && id) return await deleteProperty(req, admin, id);
    return errorResponse('Not found', 404);
  } catch (e) {
    console.error(e);
    return errorResponse(e instanceof Error ? e.message : 'Internal error', 500);
  }
});

async function listProperties(admin: ReturnType<typeof getAdminClient>, url: URL) {
  const params = url.searchParams;
  const search = params.get('search')?.trim();
  const locality = params.get('locality');
  const propertyType = params.get('property_type');
  const minPrice = params.get('min_price');
  const maxPrice = params.get('max_price');
  const minBeds = params.get('min_beds');
  const sort = params.get('sort') ?? 'distance';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') ?? '50') || 50));

  if (sort && !ALLOWED_SORT.has(sort)) {
    return errorResponse(`Invalid sort value. Allowed: ${[...ALLOWED_SORT].join(', ')}`);
  }

  let query = admin.from('properties').select('*', { count: 'exact' });

  if (search) {
    // Search across title and locality.
    query = query.or(`title.ilike.%${search}%,locality.ilike.%${search}%`);
  }
  if (locality && locality !== 'all') query = query.eq('locality', locality);
  if (propertyType && propertyType !== 'all') query = query.eq('property_type', propertyType);
  if (minPrice) query = query.gte('price_inr', Number(minPrice));
  if (maxPrice) query = query.lte('price_inr', Number(maxPrice));
  if (minBeds) query = query.gte('bedrooms', Number(minBeds));

  switch (sort) {
  case 'price_asc': query = query.order('price_inr', { ascending: true }); break;
  case 'price_desc': query = query.order('price_inr', { ascending: false }); break;
  case 'value_desc': query = query.order('price_per_sqft', { ascending: false }); break;
  case 'newest': query = query.order('listed_on', { ascending: false }); break;
  case 'oldest': query = query.order('listed_on', { ascending: true }); break;
  default: query = query.order('distance_to_tata_steel_km', { ascending: true, nullsFirst: false });
}
// Stable tiebreaker: many rows share the same (or null) primary sort value,
// so without a unique secondary key, Postgres can return a different order
// across separate paginated requests — causing the same row to appear on
// two pages (or be skipped entirely) when the frontend walks all pages.
query = query.order('id', { ascending: true });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return json({
    data,
    pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
  });
}

async function getProperty(admin: ReturnType<typeof getAdminClient>, id: string) {
  const { data, error } = await admin.from('properties').select('*').eq('id', id).maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse('Property not found', 404);
  return json({ data });
}

async function createProperty(req: Request, admin: ReturnType<typeof getAdminClient>) {
  const { user, error: authError } = await requireAdmin(req, admin);
  if (!user) return errorResponse(authError ?? 'Unauthorized', authError === 'Admin access required.' ? 403 : 401);
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body');

  const parsed = propertyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(`Validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }

  const { data, error } = await admin.from('properties').insert(parsed.data).select().single();
  if (error) return errorResponse(error.message, 500);
  return json({ data }, 201);
}

async function updateProperty(req: Request, admin: ReturnType<typeof getAdminClient>, id: string) {
  const { user, error: authError } = await requireAdmin(req, admin);
  if (!user) return errorResponse(authError ?? 'Unauthorized', authError === 'Admin access required.' ? 403 : 401);
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse('Invalid JSON body');

  const parsed = propertyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(`Validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  if (Object.keys(parsed.data).length === 0) {
    return errorResponse('No fields to update');
  }

  const { data, error } = await admin
    .from('properties')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse('Property not found', 404);
  return json({ data });
}

async function deleteProperty(req: Request, admin: ReturnType<typeof getAdminClient>, id: string) {
  const { user, error: authError } = await requireAdmin(req, admin);
  if (!user) return errorResponse(authError ?? 'Unauthorized', authError === 'Admin access required.' ? 403 : 401);
  const { error, count } = await admin
    .from('properties')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) return errorResponse(error.message, 500);
  if (!count) return errorResponse('Property not found', 404);
  return json({ data: { id, deleted: true } });
}

