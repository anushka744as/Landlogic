export interface Property {
  id: string;
  title: string;
  locality: string;
  price_inr: number;
  price_per_sqft: number;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  property_type: string;
  latitude: number;
  longitude: number;
  distance_to_tata_steel_km: number | null;
  listed_on: string;
  created_at: string;
}

// Tata Steel Jamshedpur Works coordinates
export const TATA_STEEL_COORDS = {
  lat: 22.7925,
  lng: 86.1842,
  label: 'Tata Steel Jamshedpur Works',
};

export type PriceBand = {
  label: string;
  min: number;
  max: number;
  color: string;
  fillColor: string;
};

// Price bands (in INR) used to color-code map markers & radius circles.
export const PRICE_BANDS: PriceBand[] = [
  { label: 'Under ₹40L',   min: 0,         max: 4_000_000,   color: '#0d9488', fillColor: '#14b8a6' },
  { label: '₹40L – ₹80L',  min: 4_000_000, max: 8_000_000,   color: '#0284c7', fillColor: '#38bdf8' },
  { label: '₹80L – ₹1.2Cr', min: 8_000_000, max: 12_000_000,  color: '#f59e0b', fillColor: '#fbbf24' },
  { label: 'Above ₹1.2Cr', min: 12_000_000,max: Infinity,    color: '#dc2626', fillColor: '#f87171' },
];

export function priceBandFor(priceInr: number): PriceBand {
  return PRICE_BANDS.find((b) => priceInr >= b.min && priceInr < b.max) ?? PRICE_BANDS[PRICE_BANDS.length - 1];
}

export function formatINR(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatKm(km: number | null): string {
  if (km == null) return '—';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// Map a price (INR) to a marker pixel size so expensive listings stand out.
// Range ~14px (cheapest) → ~30px (priciest) using a square-root scale.
export function markerSizeFor(priceInr: number, min = 2_000_000, max = 23_000_000): number {
  const clamped = Math.max(min, Math.min(max, priceInr));
  const t = (clamped - min) / (max - min); // 0..1
  return 14 + Math.sqrt(t) * 16; // 14 .. 30
}
