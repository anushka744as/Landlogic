// GET /analytics/summary               -> headline KPIs + JREI + rental yield
// GET /analytics/by-locality            -> per-locality price stats
// GET /analytics/proximity?threshold=&metric=  -> proximity insight + regression
// GET /analytics/price-bands            -> distribution of listings per price band
// GET /analytics/timeseries             -> listings count/avg price by month

import { handleOptions, json, errorResponse } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabaseAdmin.ts';
import {
  buildProximityInsight,
  computeDerivedMetrics,
  linearRegression,
  type PropertyRow,
} from '../_shared/analytics.ts';

const PRICE_BANDS = [
  { label: 'Under ₹40L', min: 0, max: 4_000_000 },
  { label: '₹40L – ₹80L', min: 4_000_000, max: 8_000_000 },
  { label: '₹80L – ₹1.2Cr', min: 8_000_000, max: 12_000_000 },
  { label: 'Above ₹1.2Cr', min: 12_000_000, max: Infinity },
];

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const admin = getAdminClient();
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('analytics');
  const route = idx >= 0 ? segments[idx + 1] : undefined;

  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  const { data, error } = await admin.from('properties').select('*');
  if (error) return errorResponse(error.message, 500);
  const properties = (data ?? []) as PropertyRow[];

  try {
    switch (route) {
      case 'summary': return json({ data: summary(properties) });
      case 'by-locality': return json({ data: byLocality(properties) });
      case 'proximity': {
        const threshold = Number(url.searchParams.get('threshold') ?? '3') || 3;
        const metric = (url.searchParams.get('metric') === 'rate' ? 'rate' : 'price') as 'price' | 'rate';
        return json({ data: buildProximityInsight(properties, metric, threshold) });
      }
      case 'price-bands': return json({ data: priceBands(properties) });
      case 'timeseries': return json({ data: timeseries(properties) });
      default:
        return errorResponse(
          'Unknown analytics route. Use one of: summary, by-locality, proximity, price-bands, timeseries.',
          404,
        );
    }
  } catch (e) {
    console.error(e);
    return errorResponse(e instanceof Error ? e.message : 'Internal error', 500);
  }
});

function summary(properties: PropertyRow[]) {
  const n = properties.length;
  if (n === 0) {
    return {
      totalListings: 0, avgPrice: 0, avgPricePerSqft: 0, avgDistanceKm: 0,
      localitiesCovered: 0, avgRentalYield: 0, jrei: 100, jreiChange: 0, jreiTrend: 'flat',
    };
  }
  const avgPrice = properties.reduce((s, p) => s + p.price_inr, 0) / n;
  const avgPricePerSqft = properties.reduce((s, p) => s + p.price_per_sqft, 0) / n;
  const avgDistanceKm = properties.reduce((s, p) => s + (p.distance_to_tata_steel_km ?? 0), 0) / n;
  const localitiesCovered = new Set(properties.map((p) => p.locality)).size;
  const derived = computeDerivedMetrics(properties);

  return {
    totalListings: n,
    avgPrice,
    avgPricePerSqft,
    avgDistanceKm,
    localitiesCovered,
    avgRentalYield: derived.avgRentalYield,
    jrei: derived.jrei,
    jreiChange: derived.jreiChange,
    jreiTrend: derived.jreiTrend,
  };
}

function byLocality(properties: PropertyRow[]) {
  const m = new Map<string, { n: number; sum: number; min: number; max: number; distSum: number }>();
  for (const p of properties) {
    const e = m.get(p.locality) ?? { n: 0, sum: 0, min: Infinity, max: -Infinity, distSum: 0 };
    e.n += 1;
    e.sum += p.price_inr;
    e.min = Math.min(e.min, p.price_inr);
    e.max = Math.max(e.max, p.price_inr);
    e.distSum += p.distance_to_tata_steel_km ?? 0;
    m.set(p.locality, e);
  }
  return Array.from(m.entries())
    .map(([locality, v]) => ({
      locality,
      listings: v.n,
      avgPrice: v.sum / v.n,
      minPrice: v.min,
      maxPrice: v.max,
      avgDistanceKm: v.distSum / v.n,
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);
}

function priceBands(properties: PropertyRow[]) {
  return PRICE_BANDS.map((band) => {
    const inBand = properties.filter((p) => p.price_inr >= band.min && p.price_inr < band.max);
    return { label: band.label, count: inBand.length };
  });
}

function timeseries(properties: PropertyRow[]) {
  const m = new Map<string, { n: number; sum: number }>();
  for (const p of properties) {
    const month = p.listed_on?.slice(0, 7) ?? 'unknown'; // YYYY-MM
    const e = m.get(month) ?? { n: 0, sum: 0 };
    e.n += 1;
    e.sum += p.price_inr;
    m.set(month, e);
  }
  return Array.from(m.entries())
    .map(([month, v]) => ({ month, listings: v.n, avgPrice: v.sum / v.n }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// Exported for potential reuse/testing.
export { linearRegression };
