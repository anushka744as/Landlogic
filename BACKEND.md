# LandLogic Backend

The frontend no longer talks to Supabase's PostgREST table API directly for
anything except read-only display. A real API layer — **Supabase Edge
Functions** (Deno) — now sits in front of the database and owns:

- Auth-gated CRUD for property listings
- Search / filter / sort / pagination
- Analytics aggregation (moved out of the browser)
- Server-side PDF report generation

## Architecture

```
Browser (React)
   │  fetch(...)  +  Authorization: Bearer <supabase access token>
   ▼
Supabase Edge Functions          (supabase/functions/*)
   │  service-role client (bypasses RLS; auth is checked in code)
   ▼
Supabase Postgres                (supabase/migrations/*)
```

- **Auth**: Supabase Auth (email/password). The frontend signs in via
  `supabase.auth.signInWithPassword`, and every write request carries the
  resulting `access_token` as a Bearer token. Edge Functions validate it
  with `supabase.auth.getUser(token)` before touching the database.
- **RLS**: `properties` is readable by anyone (`anon`/`authenticated`) since
  this is a public listings site, but INSERT/UPDATE/DELETE policies for
  those roles were dropped (see the `secure_rls_for_api_layer` migration).
  Only the service-role key — used exclusively inside Edge Functions — can
  write, and only after the function verifies a valid session.

## Endpoints

Base URL: `${VITE_SUPABASE_URL}/functions/v1`

### `properties`
| Method | Path               | Auth | Description |
|--------|--------------------|------|-------------|
| GET    | `/properties`      | no   | List with `search`, `locality`, `property_type`, `min_price`, `max_price`, `min_beds`, `sort` (`distance`\|`price_asc`\|`price_desc`\|`value_desc`\|`newest`\|`oldest`), `page`, `limit` query params |
| GET    | `/properties/:id`  | no   | Single listing |
| POST   | `/properties`      | yes  | Create listing |
| PATCH  | `/properties/:id`  | yes  | Update listing (partial) |
| DELETE | `/properties/:id`  | yes  | Delete listing |

### `analytics`
| Method | Path                          | Description |
|--------|-------------------------------|--------------|
| GET | `/analytics/summary`             | Headline KPIs, avg rental yield, JREI + trend |
| GET | `/analytics/by-locality`         | Per-locality price stats |
| GET | `/analytics/proximity?threshold=&metric=` | Tata Steel proximity insight + OLS regression |
| GET | `/analytics/price-bands`         | Listing counts per price band |
| GET | `/analytics/timeseries`         | Listings/avg price by month |

### `report`
| Method | Path | Description |
|--------|------|--------------|
| GET | `/report?threshold=&metric=&search=&locality=&property_type=` | Streams a generated PDF (`application/pdf`) |

## Local development

```bash
npm install -g supabase   # Supabase CLI
supabase login
supabase link --project-ref <your-project-ref>

# Apply migrations (creates table + tightens RLS)
supabase db push

# Deploy functions
supabase functions deploy properties
supabase functions deploy analytics
supabase functions deploy report

# Or serve locally for development
supabase functions serve --env-file .env.functions
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into every
deployed Edge Function's environment by Supabase — no manual configuration
needed in production. For local `functions serve`, the Supabase CLI injects
the same variables automatically when running against a linked project.

## Creating an admin user

There's no separate admin role yet — any signed-up user can create/edit/
delete listings. To create the first user, either:

1. Use the in-app "Sign in" → "Sign up" form, or
2. Add a user directly from the Supabase Dashboard → Authentication → Users.

If you want to restrict writes to specific users later, the cleanest path
is adding an `is_admin` claim to the user's `app_metadata` and checking it
inside `requireUser()` in `supabase/functions/_shared/auth.ts`.

## Frontend env vars

No new env vars are required beyond the existing:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The Edge Functions base URL is derived automatically as
`${VITE_SUPABASE_URL}/functions/v1`.
