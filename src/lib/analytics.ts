// Pure helpers for proximity analytics + regression used on Insights page.

import type { Property } from '../types/property';

export interface ScatterPoint {
  x: number; // distance km
  y: number; // price_inr (or rate)
  property: Property;
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r: number; // Pearson correlation
}

export function linearRegression(points: { x: number; y: number }[]): LinearFit | null {
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r = sxy / Math.sqrt(sxx * syy);
  return { slope, intercept, r };
}

export function formatINRShort(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(0)}L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

export interface ProximityInsight {
  withinAvg: number | null;
  beyondAvg: number | null;
  premiumPct: number | null;
  thresholdKm: number;
  r: number | null;
  slopePerKm: number | null;
  direction: 'closer-more-expensive' | 'farther-more-expensive' | 'flat';
  summary: string;
}

export function buildProximityInsight(
  properties: Property[],
  metric: 'price' | 'rate',
  thresholdKm = 3,
): ProximityInsight {
  const valid = properties.filter((p) => p.distance_to_tata_steel_km != null);
  if (valid.length === 0) {
    return {
      withinAvg: null, beyondAvg: null, premiumPct: null,
      thresholdKm, r: null, slopePerKm: null, direction: 'flat',
      summary: 'No geo-located listings available to analyse.',
    };
  }
  const within = valid.filter((p) => (p.distance_to_tata_steel_km ?? 0) <= thresholdKm);
  const beyond = valid.filter((p) => (p.distance_to_tata_steel_km ?? 0) > thresholdKm);
  const pick = (p: Property) => (metric === 'price' ? p.price_inr : p.price_per_sqft);
  const withinAvg = within.length ? within.reduce((s, p) => s + pick(p), 0) / within.length : null;
  const beyondAvg = beyond.length ? beyond.reduce((s, p) => s + pick(p), 0) / beyond.length : null;

  const fit = linearRegression(
    valid.map((p) => ({ x: p.distance_to_tata_steel_km ?? 0, y: pick(p) })),
  );

  let premiumPct: number | null = null;
  if (withinAvg != null && beyondAvg != null && beyondAvg > 0) {
    premiumPct = ((withinAvg - beyondAvg) / beyondAvg) * 100;
  }

  let direction: ProximityInsight['direction'] = 'flat';
  if (fit) {
    if (fit.slope < -0.01) direction = 'closer-more-expensive';
    else if (fit.slope > 0.01) direction = 'farther-more-expensive';
  }

  let summary: string;
  const metricLabel = metric === 'price' ? 'price' : 'price per sqft';
  const fmt = metric === 'price' ? formatINRShort : (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
  if (premiumPct != null && Math.abs(premiumPct) >= 1) {
    const sign = premiumPct > 0 ? 'premium' : 'discount';
    summary = `Properties within ${thresholdKm} km of Tata Steel command a ${Math.abs(premiumPct).toFixed(0)}% ${sign} in ${metricLabel} (avg ${fmt(withinAvg!)} vs ${fmt(beyondAvg!)} beyond ${thresholdKm} km).`;
  } else {
    summary = `${metricLabel === 'price' ? 'Price' : 'Rate'} shows little sensitivity to Tata Steel proximity within this dataset — other factors (locality, type, area) dominate.`;
  }
  if (fit && Math.abs(fit.r) >= 0.2) {
    const strength = Math.abs(fit.r) >= 0.6 ? 'strong' : Math.abs(fit.r) >= 0.4 ? 'moderate' : 'weak';
    const trendWord = direction === 'closer-more-expensive' ? 'falls' : direction === 'farther-more-expensive' ? 'rises' : 'is flat';
    summary += ` Linear fit ${trendWord} by ${fmt(Math.abs(fit.slope))}/km with a ${strength} correlation (r = ${fit.r.toFixed(2)}).`;
  }

  return {
    withinAvg, beyondAvg, premiumPct, thresholdKm,
    r: fit?.r ?? null, slopePerKm: fit?.slope ?? null, direction, summary,
  };
}

// ---------------------------------------------------------------------------
// Derived market metrics — Avg Rental Yield & JREI
// ---------------------------------------------------------------------------

/**
 * Estimates an annualised gross rental yield for each property.
 *
 * Methodology: In Jamshedpur's market, residential gross yields range from
 * ~2.5 % (high-end) to ~4.5 % (affordable segment). We modulate yield using
 * two observable signals:
 *   1. Price band — cheaper properties tend to yield more.
 *   2. Distance to industrial anchor — closer properties have stronger rental
 *      demand from Tata Steel employees, nudging yield up slightly.
 *
 * Base yield schedule (annual gross, % of capital value):
 *   < ₹40L  → 4.2 %    |  ₹40L-₹80L → 3.6 %
 *   ₹80L-₹1.2Cr → 3.1 % |  > ₹1.2Cr  → 2.6 %
 *
 * Proximity premium: −0.08 % per km from Tata Steel (proximity boosts yield).
 */
function estimatedYield(priceInr: number, distKm: number | null): number {
  let base: number;
  if (priceInr < 4_000_000)       base = 4.2;
  else if (priceInr < 8_000_000)  base = 3.6;
  else if (priceInr < 12_000_000) base = 3.1;
  else                             base = 2.6;

  // Proximity premium caps at 0.5 pp (i.e. ≤ 6.25 km distance benefit)
  const proximityBoost = distKm != null ? Math.min(0.5, distKm * 0.08) : 0;
  return base + proximityBoost;
}

export interface DerivedMetrics {
  avgRentalYield: number;      // % e.g. 3.4
  jrei: number;                // index, base = 100
  jreiChange: number;          // % change vs. prior pseudo-period
  jreiTrend: 'up' | 'down' | 'flat';
}

/**
 * Computes Avg Rental Yield and the Jamshedpur Real Estate Index (JREI).
 *
 * JREI methodology (composite, base 100):
 *   Component weights:
 *     40 % — avg price vs. dataset median (price level)
 *     30 % — avg ₹/sqft vs. dataset median (density premium)
 *     20 % — proximity utilisation (% of listings within 3 km of anchor)
 *     10 % — listing volume (normalised log count)
 *
 *   Each component is expressed as a ratio to its reference value, then the
 *   weighted sum is scaled to produce an index centred on 100.
 *
 * Simulated prior-period change: we re-compute JREI excluding the newest 15 %
 * of listings (by `listed_on` date) to approximate "last period" and derive a
 * % delta. This gives a directional signal without requiring historical data.
 */
export function computeDerivedMetrics(properties: Property[]): DerivedMetrics {
  if (properties.length === 0) {
    return { avgRentalYield: 0, jrei: 100, jreiChange: 0, jreiTrend: 'flat' };
  }

  // --- Avg Rental Yield ---
  const yieldSum = properties.reduce(
    (s, p) => s + estimatedYield(p.price_inr, p.distance_to_tata_steel_km),
    0,
  );
  const avgRentalYield = yieldSum / properties.length;

  // --- JREI ---
  const calcJrei = (ps: Property[]): number => {
    if (ps.length === 0) return 100;
    const n = ps.length;
    const prices = ps.map((p) => p.price_inr);
    const rates  = ps.map((p) => p.price_per_sqft);

    const medianPrice = [...prices].sort((a, b) => a - b)[Math.floor(n / 2)];
    const medianRate  = [...rates].sort((a, b) => a - b)[Math.floor(n / 2)];

    const avgPrice = prices.reduce((s, v) => s + v, 0) / n;
    const avgRate  = rates.reduce((s, v) => s + v, 0) / n;

    // Proximity utilisation (within 3 km of Tata Steel)
    const withinCount = ps.filter((p) => (p.distance_to_tata_steel_km ?? 99) <= 3).length;
    const proximityUtil = withinCount / n; // 0–1

    // Log-normalised volume (anchored: 100 listings → ratio 1)
    const volRatio = Math.log1p(n) / Math.log1p(100);

    const priceRatio    = medianPrice > 0 ? avgPrice / medianPrice : 1;
    const rateRatio     = medianRate  > 0 ? avgRate  / medianRate  : 1;
    const proximityComp = 0.5 + proximityUtil; // maps 0–1 → 0.5–1.5
    const volComp       = Math.min(2, volRatio);

    const composite =
      0.40 * priceRatio +
      0.30 * rateRatio  +
      0.20 * proximityComp +
      0.10 * volComp;

    return composite * 100;
  };

  const jrei = calcJrei(properties);

  // Simulate prior period: exclude most-recent 15 % of listings
  const sorted = [...properties].sort(
    (a, b) => new Date(a.listed_on).getTime() - new Date(b.listed_on).getTime(),
  );
  const cutoff = Math.max(1, Math.floor(sorted.length * 0.85));
  const priorProps = sorted.slice(0, cutoff);
  const priorJrei = calcJrei(priorProps);

  const jreiChange = priorJrei > 0 ? ((jrei - priorJrei) / priorJrei) * 100 : 0;
  const jreiTrend: DerivedMetrics['jreiTrend'] =
    Math.abs(jreiChange) < 0.05 ? 'flat' : jreiChange > 0 ? 'up' : 'down';

  return { avgRentalYield, jrei, jreiChange, jreiTrend };
}
