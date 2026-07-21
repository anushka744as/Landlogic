/*
# Create properties table for Jamshedpur real-estate listings

## Purpose
Stores property listings in the Jamshedpur area with geographic coordinates
so we can compute proximity to Tata Steel Jamshedpur Works
(22.7925° N, 86.1842° E).

## 1. New Tables

### `properties`
- `id` (uuid, primary key)
- `title` (text) — short listing title
- `locality` (text) — Jamshedpur neighborhood name (e.g. Bistupur, Sakchi)
- `price_inr` (numeric) — listing price in Indian Rupees
- `price_per_sqft` (numeric) — price per square foot in INR
- `bedrooms` (int) — number of bedrooms (BHK)
- `bathrooms` (int) — number of bathrooms
- `area_sqft` (numeric) — built-up area in square feet
- `property_type` (text) — Apartment / Villa / Independent House / Plot
- `latitude` (double precision) — locality latitude (approximate)
- `longitude` (double precision) — locality longitude (approximate)
- `distance_to_tata_steel_km` (double precision) — computed great-circle
  distance from the property's lat/long to Tata Steel Jamshedpur Works
  (22.7925, 86.1842), in kilometers. Populated by a BEFORE INSERT/UPDATE
  trigger so it is always correct even if coordinates change.
- `listed_on` (date) — date the property was listed
- `created_at` (timestamptz) — row creation timestamp

## 2. Functions

### `tata_steel_distance_km(lat double, lon double)`
Returns the haversine great-circle distance in km between the given point
and Tata Steel Jamshedpur Works (22.7925, 86.1842).

### `trg_set_distance_to_tata_steel()`
Trigger function that sets `distance_to_tata_steel_km` on every
INSERT or UPDATE of latitude/longitude.

## 3. Security
- RLS enabled on `properties`.
- This is a single-tenant demo (no sign-in screen), so all CRUD is open to
  `anon, authenticated` — the data is intentionally public/shared.

## 4. Seed Data
~24 representative listings across Jamshedpur localities
(Bistupur, Sakchi, Mango, Sonari, Kadma, Adityapur, Birsanagar, etc.)
with realistic approximate coordinates and prices, so the app renders
meaningful charts and map markers out of the box.
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  locality text NOT NULL,
  price_inr numeric NOT NULL,
  price_per_sqft numeric NOT NULL,
  bedrooms int NOT NULL,
  bathrooms int NOT NULL,
  area_sqft numeric NOT NULL,
  property_type text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  distance_to_tata_steel_km double precision,
  listed_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Haversine distance to Tata Steel Jamshedpur Works (22.7925, 86.1842)
CREATE OR REPLACE FUNCTION tata_steel_distance_km(lat double precision, lon double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    6371.0 * acos(
      least(1.0,
        sin(radians(22.7925)) * sin(radians(lat)) +
        cos(radians(22.7925)) * cos(radians(lat)) *
        cos(radians(86.1842 - lon))
      )
    );
$$;

CREATE OR REPLACE FUNCTION trg_set_distance_to_tata_steel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.distance_to_tata_steel_km := tata_steel_distance_km(NEW.latitude, NEW.longitude);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_set_distance ON properties;
CREATE TRIGGER properties_set_distance
BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
FOR EACH ROW
EXECUTE FUNCTION trg_set_distance_to_tata_steel();

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "anon_select_properties" ON properties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
CREATE POLICY "anon_insert_properties" ON properties FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_properties" ON properties;
CREATE POLICY "anon_update_properties" ON properties FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_properties" ON properties;
CREATE POLICY "anon_delete_properties" ON properties FOR DELETE
  TO anon, authenticated USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS properties_locality_idx ON properties (locality);
CREATE INDEX IF NOT EXISTS properties_distance_idx ON properties (distance_to_tata_steel_km);

-- Seed data: realistic-ish Jamshedpur listings.
-- Coordinates are approximate locality centers.
INSERT INTO properties
  (title, locality, price_inr, price_per_sqft, bedrooms, bathrooms, area_sqft, property_type, latitude, longitude, listed_on)
VALUES
  ('3BHK Bistupur Park View',       'Bistupur',     12500000, 8500, 3, 3, 1470, 'Apartment',        22.7850, 86.1950, '2024-11-12'),
  ('2BHK Bistupur City Centre',     'Bistupur',     6800000,  7800, 2, 2, 870,  'Apartment',        22.7872, 86.1920, '2024-11-20'),
  ('4BHK Villa Bistupur Greens',    'Bistupur',     22500000, 9200, 4, 4, 2445, 'Villa',            22.7835, 86.1980, '2024-10-05'),
  ('3BHK Sakchi Market',            'Sakchi',       5200000,  5500, 3, 2, 945,  'Apartment',        22.8015, 86.2070, '2024-12-01'),
  ('2BHK Sakchi Town',              'Sakchi',       3800000,  5200, 2, 2, 730,  'Apartment',        22.8030, 86.2055, '2024-12-15'),
  ('Independent House Sakchi',      'Sakchi',       8500000,  4800, 4, 3, 1770, 'Independent House',22.8000, 86.2100, '2024-09-18'),
  ('3BHK Kadma Riverside',          'Kadma',        7200000,  6200, 3, 2, 1160, 'Apartment',        22.7780, 86.1880, '2024-11-28'),
  ('2BHK Kadma Garden',             'Kadma',        4500000,  5800, 2, 2, 775,  'Apartment',        22.7765, 86.1860, '2024-12-10'),
  ('4BHK Kadma Premium',            'Kadma',        11500000, 6800, 4, 4, 1690, 'Apartment',        22.7800, 86.1900, '2024-10-22'),
  ('3BHK Sonari Greens',            'Sonari',       6100000,  5600, 3, 2, 1090, 'Apartment',        22.7700, 86.1800, '2024-11-05'),
  ('2BHK Sonari Hills',             'Sonari',       4200000,  5400, 2, 2, 778,  'Apartment',        22.7685, 86.1785, '2024-12-18'),
  ('Independent House Sonari',      'Sonari',       7800000,  4900, 4, 3, 1590, 'Independent House',22.7720, 86.1820, '2024-09-30'),
  ('3BHK Mango Central',            'Mango',        3600000,  3900, 3, 2, 925,  'Apartment',        22.8330, 86.2210, '2024-12-08'),
  ('2BHK Mango Family',             'Mango',        2800000,  3700, 2, 2, 755,  'Apartment',        22.8350, 86.2230, '2024-12-20'),
  ('4BHK Mango Estate',             'Mango',        5200000,  4200, 4, 3, 1240, 'Independent House',22.8310, 86.2190, '2024-10-12'),
  ('3BHK Birsanagar Sector 3',      'Birsanagar',   3100000,  3400, 3, 2, 910,  'Apartment',        22.8120, 86.2400, '2024-11-25'),
  ('2BHK Birsanagar Sector 1',      'Birsanagar',   2400000,  3300, 2, 1, 727,  'Apartment',        22.8145, 86.2385, '2024-12-22'),
  ('3BHK Adityapur Central',        'Adityapur',    4200000,  4500, 3, 2, 935,  'Apartment',        22.7310, 86.1660, '2024-11-15'),
  ('2BHK Adityapur Garden',         'Adityapur',    3200000,  4300, 2, 2, 745,  'Apartment',        22.7335, 86.1685, '2024-12-03'),
  ('4BHK Adityapur Greens',         'Adityapur',    6900000,  5100, 4, 3, 1350, 'Apartment',        22.7285, 86.1635, '2024-10-08'),
  ('Plot Bistupur Extension',       'Bistupur',     8500000,  9500, 0, 0, 895,  'Plot',             22.7810, 86.2000, '2024-09-12'),
  ('Plot Sonari Outskirts',         'Sonari',       3200000,  3600, 0, 0, 890,  'Plot',             22.7650, 86.1750, '2024-09-25'),
  ('3BHK Telco Colony',             'Telco',        5500000,  5200, 3, 2, 1060, 'Apartment',        22.8200, 86.1900, '2024-11-08'),
  ('2BHK Telco Family',             'Telco',        3800000,  5000, 2, 2, 760,  'Apartment',        22.8220, 86.1920, '2024-12-12')
ON CONFLICT DO NOTHING;
