import { useMemo, useState } from 'react';
import { Sparkles, Factory, TrendingUp, Hash, IndianRupee, Download } from 'lucide-react';
import type { Property } from '../types/property';
import { Card, EmptyState, KpiTile, PageHeader, StatPill } from '../components/ui';
import { formatINR, formatKm, priceBandFor, PRICE_BANDS, TATA_STEEL_COORDS } from '../types/property';
import { buildProximityInsight, formatINRShort, linearRegression, type ScatterPoint } from '../lib/analytics';
import { useTheme } from '../hooks/useTheme';
import { reportApi } from '../lib/api';

type Metric = 'price' | 'rate';

export default function InsightsPage({ properties, loading }: { properties: Property[]; loading: boolean }) {
  const [metric, setMetric] = useState<Metric>('price');
  const [threshold, setThreshold] = useState(3);
  const [exporting, setExporting] = useState(false);
  const { theme } = useTheme();

  const points: ScatterPoint[] = useMemo(
    () =>
      properties
        .filter((p) => p.distance_to_tata_steel_km != null)
        .map((p) => ({ x: p.distance_to_tata_steel_km ?? 0, y: metric === 'price' ? p.price_inr : p.price_per_sqft, property: p })),
    [properties, metric],
  );

  const fit = useMemo(() => linearRegression(points.map(({ x, y }) => ({ x, y }))), [points]);
  const insight = useMemo(() => buildProximityInsight(properties, metric, threshold), [properties, metric, threshold]);

  const kpis = useMemo(() => {
    if (properties.length === 0) return null;
    const avg = properties.reduce((s, p) => s + (p.distance_to_tata_steel_km ?? 0), 0) / properties.length;
    const byLocality = new Map<string, { sum: number; n: number }>();
    for (const p of properties) {
      const e = byLocality.get(p.locality) ?? { sum: 0, n: 0 };
      e.sum += p.price_inr; e.n += 1; byLocality.set(p.locality, e);
    }
    const cheapest = [...byLocality.entries()].map(([loc, v]) => ({ loc, avg: v.sum / v.n })).sort((a, b) => a.avg - b.avg)[0];
    const priciest = [...byLocality.entries()].map(([loc, v]) => ({ loc, avg: v.sum / v.n })).sort((a, b) => b.avg - a.avg)[0];
    return { avg, cheapest, priciest };
  }, [properties]);

  const localityRows = useMemo(() => {
    const m = new Map<string, { n: number; avg: number; min: number; max: number; avgDist: number }>();
    for (const p of properties) {
      const e = m.get(p.locality) ?? { n: 0, avg: 0, min: Infinity, max: -Infinity, avgDist: 0 };
      e.n += 1; e.min = Math.min(e.min, p.price_inr); e.max = Math.max(e.max, p.price_inr);
      e.avg += p.price_inr; e.avgDist += p.distance_to_tata_steel_km ?? 0;
      m.set(p.locality, e);
    }
    return Array.from(m.entries())
      .map(([loc, v]) => ({ loc, n: v.n, avg: v.avg / v.n, min: v.min, max: v.max, avgDist: v.avgDist / v.n }))
      .sort((a, b) => b.avg - a.avg);
  }, [properties]);

  const onDownload = async () => {
    setExporting(true);
    try {
      // PDF is now generated server-side (Edge Function) — the browser only
      // requests it and saves the returned file.
      await reportApi.download({ threshold, metric });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Market insights"
        title="Price & Proximity Analytics"
        subtitle="How does distance to Tata Steel Jamshedpur Works shape property prices across the city?"
        icon={<Sparkles className="h-6 w-6" strokeWidth={2.2} />}
        action={
          <button
            onClick={onDownload}
            disabled={loading || properties.length === 0 || exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-glow transition-colors"
          >
            <Download className="h-4 w-4" strokeWidth={2.2} />
            {exporting ? 'Generating…' : 'Download report'}
          </button>
        }
      />

      {loading ? (
        <EmptyState message="Crunching the numbers…" />
      ) : properties.length === 0 ? (
        <EmptyState message="No data available." />
      ) : (
        <>
          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiTile label="Listings analysed" tone="neutral" numericValue={properties.length} format={(v) => Math.round(v).toLocaleString('en-IN')} delay={0} />
              <KpiTile label="Avg distance to Tata Steel" tone="brand" numericValue={kpis.avg} format={(v) => formatKm(v)} delay={60} />
              <KpiTile label="Priciest locality" tone="blue" value={kpis.priciest.loc} sub={formatINR(kpis.priciest.avg)} delay={120} />
              <KpiTile label="Most affordable" tone="green" value={kpis.cheapest.loc} sub={formatINR(kpis.cheapest.avg)} delay={180} />
            </div>
          )}

          {/* Industrial Proximity Analysis */}
          <Card className="overflow-hidden animate-fade-in-up">
            <div className="p-5 sm:p-6 border-b border-ink-100 dark:border-ink-700 bg-gradient-to-r from-brand-50/60 to-transparent dark:from-brand-900/30 dark:to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-600 text-white grid place-items-center shadow-glow">
                    <Factory className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-xl text-ink-900 dark:text-white">Industrial Proximity Analysis</h2>
                    <p className="text-sm text-ink-500 dark:text-ink-400">Distance to Tata Steel vs. asking {metric === 'price' ? 'price' : 'price per sqft'}.</p>
                  </div>
                </div>
                <MetricToggle metric={metric} onChange={setMetric} />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ScatterPlot points={points} fit={fit} metric={metric} dark={theme === 'dark'} />
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-brand-50/70 dark:bg-brand-900/30 ring-1 ring-brand-100 dark:ring-brand-800 p-4">
                    <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wide">
                      <TrendingUp className="h-4 w-4" /> Auto-generated insight
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-800 dark:text-ink-100 font-medium">{insight.summary}</p>
                  </div>

                  <ThresholdSelector value={threshold} onChange={setThreshold} />

                  <div className="grid grid-cols-2 gap-2.5">
                    <MiniStat
                      label={`Avg within ${threshold} km`}
                      value={insight.withinAvg != null ? (metric === 'price' ? formatINRShort(insight.withinAvg) : `₹${Math.round(insight.withinAvg).toLocaleString('en-IN')}`) : '—'}
                      tone="brand"
                    />
                    <MiniStat
                      label={`Avg beyond ${threshold} km`}
                      value={insight.beyondAvg != null ? (metric === 'price' ? formatINRShort(insight.beyondAvg) : `₹${Math.round(insight.beyondAvg).toLocaleString('en-IN')}`) : '—'}
                    />
                    <MiniStat
                      label="Price premium"
                      value={insight.premiumPct != null ? `${insight.premiumPct > 0 ? '+' : ''}${insight.premiumPct.toFixed(0)}%` : '—'}
                      tone={insight.premiumPct != null && insight.premiumPct > 0 ? 'success' : insight.premiumPct != null && insight.premiumPct < 0 ? 'danger' : 'neutral'}
                    />
                    <MiniStat
                      label="Correlation r"
                      value={insight.r != null ? insight.r.toFixed(2) : '—'}
                      tone={insight.r != null && Math.abs(insight.r) >= 0.4 ? 'brand' : 'neutral'}
                    />
                  </div>

                  <div className="text-xs text-ink-400 dark:text-ink-500 leading-relaxed pt-1">
                    Reference point: {TATA_STEEL_COORDS.label} ({TATA_STEEL_COORDS.lat}°N, {TATA_STEEL_COORDS.lng}°E).
                    Distances computed with the haversine formula and stored as <span className="font-mono text-ink-600 dark:text-ink-300">distance_to_tata_steel_km</span>.
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Locality ranking */}
          <Card className="animate-fade-in-up">
            <div className="p-5 sm:p-6 border-b border-ink-100 dark:border-ink-700">
              <h2 className="font-display font-extrabold text-xl text-ink-900 dark:text-white">Locality price ranking</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Average asking price by locality, with mean distance to Tata Steel.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/60 dark:bg-ink-700/40 text-ink-500 dark:text-ink-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">#</th>
                    <th className="text-left px-5 py-3 font-semibold">Locality</th>
                    <th className="text-right px-5 py-3 font-semibold">Listings</th>
                    <th className="text-right px-5 py-3 font-semibold">Avg price</th>
                    <th className="text-right px-5 py-3 font-semibold">Min – Max</th>
                    <th className="text-right px-5 py-3 font-semibold">Avg dist to Tata Steel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
                  {localityRows.map((r, i) => {
                    const band = priceBandFor(r.avg);
                    return (
                      <tr key={r.loc} className="hover:bg-ink-50/40 dark:hover:bg-ink-700/30 transition-colors">
                        <td className="px-5 py-3 text-ink-400 dark:text-ink-500 font-mono">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-ink-900 dark:text-white flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: band.fillColor }} />
                          {r.loc}
                        </td>
                        <td className="px-5 py-3 text-right text-ink-600 dark:text-ink-300">{r.n}</td>
                        <td className="px-5 py-3 text-right font-bold text-ink-900 dark:text-white">{formatINR(r.avg)}</td>
                        <td className="px-5 py-3 text-right text-ink-600 dark:text-ink-300">{formatINR(r.min)} – {formatINR(r.max)}</td>
                        <td className="px-5 py-3 text-right">
                          <StatPill label="" value={formatKm(r.avgDist)} tone="brand" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------- Scatter plot (pure SVG, theme-aware) ---------- */

function ScatterPlot({
  points,
  fit,
  metric,
  dark,
}: {
  points: ScatterPoint[];
  fit: ReturnType<typeof linearRegression>;
  metric: Metric;
  dark: boolean;
}) {
  const W = 640, H = 420, padL = 64, padR = 24, padT = 24, padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xMax = Math.max(5, ...points.map((p) => p.x)) * 1.1;
  const xMin = 0;
  const yMax = Math.max(...points.map((p) => p.y)) * 1.08;
  const yMin = 0;

  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * innerW;
  const sy = (y: number) => padT + innerH - ((y - yMin) / (yMax - yMin)) * innerH;

  const xTicks = 5, yTicks = 4;
  const xTickVals = Array.from({ length: xTicks + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / xTicks);
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

  const yFmt = metric === 'price' ? formatINRShort : (v: number) => `₹${(v / 1000).toFixed(0)}k`;
  const gridColor = dark ? '#1f2937' : '#e5e7eb';
  const axisColor = dark ? '#4b5563' : '#9ca3af';
  const labelFill = dark ? '#9ca3af' : '#6b7280';
  const titleFill = dark ? '#e5e7eb' : '#374151';
  const panelFill = dark ? '#111827' : 'white';
  const panelStroke = dark ? '#374151' : '#d1d5db';

  const trendLine =
    fit != null
      ? [
          { x: xMin, y: fit.intercept + fit.slope * xMin },
          { x: xMax, y: fit.intercept + fit.slope * xMax },
        ]
      : null;

  return (
    <div className="w-full">
      <div className="aspect-[16/10] w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Scatter plot of distance to Tata Steel vs property price">
          {yTickVals.map((v, i) => (
            <line key={`gy${i}`} x1={padL} x2={W - padR} y1={sy(v)} y2={sy(v)} stroke={gridColor} strokeWidth={1} />
          ))}
          {xTickVals.map((v, i) => (
            <line key={`gx${i}`} x1={sx(v)} x2={sx(v)} y1={padT} y2={H - padB} stroke={gridColor} strokeWidth={1} opacity={0.6} />
          ))}

          <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={axisColor} strokeWidth={1.2} />
          <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke={axisColor} strokeWidth={1.2} />

          {xTickVals.map((v, i) => (
            <text key={`xt${i}`} x={sx(v)} y={H - padB + 18} textAnchor="middle" fill={labelFill} fontSize={11}>{v.toFixed(1)}</text>
          ))}
          {yTickVals.map((v, i) => (
            <text key={`yt${i}`} x={padL - 10} y={sy(v) + 3.5} textAnchor="end" fill={labelFill} fontSize={11}>{yFmt(v)}</text>
          ))}

          <text x={padL + innerW / 2} y={H - 8} textAnchor="middle" fill={titleFill} fontSize={12} fontWeight={700}>Distance to Tata Steel (km)</text>
          <text x={14} y={padT + innerH / 2} textAnchor="middle" transform={`rotate(-90 14 ${padT + innerH / 2})`} fill={titleFill} fontSize={12} fontWeight={700}>
            {metric === 'price' ? 'Property price' : 'Price per sqft (₹)'}
          </text>

          {trendLine && (
            <>
              <line
                x1={sx(trendLine[0].x)}
                y1={sy(Math.max(yMin, Math.min(yMax, trendLine[0].y)))}
                x2={sx(trendLine[1].x)}
                y2={sy(Math.max(yMin, Math.min(yMax, trendLine[1].y)))}
                stroke="#1a5fe6"
                strokeWidth={2.4}
                strokeDasharray="7 5"
                strokeLinecap="round"
              />
              <g>
                <rect x={W - padR - 150} y={padT + 6} width={146} height={40} rx={8} fill={panelFill} stroke={panelStroke} />
                <text x={W - padR - 142} y={padT + 22} fontSize={11} fill={titleFill} fontWeight={700}>Trend (OLS)</text>
                <text x={W - padR - 142} y={padT + 38} fontSize={11} fill={labelFill}>
                  r = {fit!.r.toFixed(2)} · slope {fit!.slope < 0 ? '−' : '+'}{yFmt(Math.abs(fit!.slope))}/km
                </text>
              </g>
            </>
          )}

          {points.map((p) => {
            const band = priceBandFor(p.property.price_inr);
            return (
              <circle key={p.property.id} cx={sx(p.x)} cy={sy(p.y)} r={6} fill={band.fillColor} fillOpacity={0.85} stroke={band.color} strokeWidth={1.3}>
                <title>{p.property.title} — {formatINR(p.property.price_inr)} · {formatKm(p.x)}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600 dark:text-ink-300">
        <span className="font-semibold text-ink-700 dark:text-ink-200">Price band</span>
        {PRICE_BANDS.map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.fillColor }} /> {b.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 ml-2">
          <span className="inline-block w-6 h-0.5 bg-brand-600" style={{ borderTop: '2px dashed #1a5fe6' }} />
          Linear trend
        </span>
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */

function MetricToggle({ metric, onChange }: { metric: Metric; onChange: (m: Metric) => void }) {
  return (
    <div className="inline-flex bg-ink-50 dark:bg-ink-800 rounded-lg p-1 border border-ink-100 dark:border-ink-700 text-sm font-semibold">
      <button
        onClick={() => onChange('price')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${metric === 'price' ? 'bg-white dark:bg-ink-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white'}`}
      >
        <IndianRupee className="h-3.5 w-3.5" /> Price
      </button>
      <button
        onClick={() => onChange('rate')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${metric === 'rate' ? 'bg-white dark:bg-ink-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white'}`}
      >
        <Hash className="h-3.5 w-3.5" /> ₹/sqft
      </button>
    </div>
  );
}

function ThresholdSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400 font-semibold mb-1.5">
        <span>Proximity threshold</span>
        <span className="font-mono text-brand-700 dark:text-brand-300">{value} km</span>
      </div>
      <input type="range" min={1} max={8} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-600" />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'brand' | 'success' | 'danger';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-50 dark:bg-ink-700/60 text-ink-800 dark:text-ink-100 ring-ink-100 dark:ring-ink-600',
    brand: 'bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-200 ring-brand-100 dark:ring-brand-800',
    success: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-emerald-100 dark:ring-emerald-800',
    danger: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 ring-rose-100 dark:ring-rose-800',
  };
  return (
    <div className={`rounded-lg ring-1 px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80 font-semibold">{label}</div>
      <div className="font-display font-extrabold text-base mt-0.5">{value}</div>
    </div>
  );
}
