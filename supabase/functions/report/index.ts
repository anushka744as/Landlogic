// GET /report?threshold=3&locality=&property_type=&search=&metric=price
// Generates the "LandLogic Insights Report" PDF server-side and returns
// it as a binary application/pdf response (frontend triggers a download).

import { jsPDF } from 'npm:jspdf@2.5.2';
import { handleOptions, errorResponse, corsHeaders } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabaseAdmin.ts';
import {
  buildProximityInsight,
  linearRegression,
  formatINR,
  formatINRShort,
  formatKm,
  type PropertyRow,
} from '../_shared/analytics.ts';

const TATA_STEEL_COORDS = { lat: 22.7925, lng: 86.1842, label: 'Tata Steel Jamshedpur Works' };

const INK: [number, number, number] = [11, 18, 32];
const BRAND: [number, number, number] = [26, 95, 230];
const MUTED: [number, number, number] = [107, 114, 128];
const SOFT: [number, number, number] = [243, 244, 246];

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  const admin = getAdminClient();
  const url = new URL(req.url);
  const params = url.searchParams;
  const thresholdKm = Number(params.get('threshold') ?? '3') || 3;
  const metric = (params.get('metric') === 'rate' ? 'rate' : 'price') as 'price' | 'rate';
  const search = params.get('search')?.trim();
  const locality = params.get('locality');
  const propertyType = params.get('property_type');

  try {
    let query = admin.from('properties').select('*');
    if (search) query = query.or(`title.ilike.%${search}%,locality.ilike.%${search}%`);
    if (locality && locality !== 'all') query = query.eq('locality', locality);
    if (propertyType && propertyType !== 'all') query = query.eq('property_type', propertyType);

    const { data, error } = await query;
    if (error) return errorResponse(error.message, 500);
    const properties = (data ?? []) as PropertyRow[];

    const pdfBytes = buildReportPdf(properties, thresholdKm, metric);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="landlogic-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return errorResponse(e instanceof Error ? e.message : 'Internal error', 500);
  }
});

function buildReportPdf(properties: PropertyRow[], thresholdKm: number, metric: 'price' | 'rate'): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 48;

  const ensure = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LandLogic — Insights Report', margin, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Tata Steel proximity analytics summary', margin, 52);
  doc.setFontSize(9);
  const stamp = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  doc.text(`Generated ${stamp}`, pageW - margin, 52, { align: 'right' });
  y = 110;
  doc.setTextColor(...INK);

  const n = properties.length;
  const avgDist = n ? properties.reduce((s, p) => s + (p.distance_to_tata_steel_km ?? 0), 0) / n : 0;
  const avgPrice = n ? properties.reduce((s, p) => s + p.price_inr, 0) / n : 0;
  const avgRate = n ? properties.reduce((s, p) => s + p.price_per_sqft, 0) / n : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Key metrics', margin, y);
  y += 8;
  doc.setDrawColor(...SOFT);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  const kpis = [
    ['Listings analysed', `${n}`],
    ['Avg distance to Tata Steel', formatKm(avgDist)],
    ['Average price', formatINR(avgPrice)],
    ['Average rate', `Rs.${Math.round(avgRate).toLocaleString('en-IN')}/sqft`],
    ['Reference point', `${TATA_STEEL_COORDS.lat}N, ${TATA_STEEL_COORDS.lng}E`],
  ];
  kpis.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(k, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(v, pageW - margin, y, { align: 'right' });
    y += 18;
  });
  y += 6;

  ensure(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('Industrial proximity analysis', margin, y);
  y += 8;
  doc.setDrawColor(...SOFT);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  const insight = buildProximityInsight(properties, metric, thresholdKm);
  const validPoints = properties
    .filter((p) => p.distance_to_tata_steel_km != null)
    .map((p) => ({ x: p.distance_to_tata_steel_km ?? 0, y: p.price_inr }));
  const fit = linearRegression(validPoints);

  const lines = [
    `Proximity threshold: ${thresholdKm} km`,
    `Avg price within ${thresholdKm} km: ${insight.withinAvg != null ? formatINRShort(insight.withinAvg) : 'n/a'}`,
    `Avg price beyond ${thresholdKm} km: ${insight.beyondAvg != null ? formatINRShort(insight.beyondAvg) : 'n/a'}`,
    `Price premium: ${insight.premiumPct != null ? `${insight.premiumPct > 0 ? '+' : ''}${insight.premiumPct.toFixed(0)}%` : 'n/a'}`,
    `Correlation (r): ${insight.r != null ? insight.r.toFixed(2) : 'n/a'}`,
    `Slope: ${fit ? `${fit.slope < 0 ? '-' : '+'}${formatINRShort(Math.abs(fit.slope))}/km` : 'n/a'}`,
  ];
  doc.setFontSize(10);
  lines.forEach((l) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('•', margin + 2, y);
    doc.setTextColor(...INK);
    doc.text(l, margin + 14, y);
    y += 16;
  });
  y += 6;

  ensure(70);
  const summaryLines = doc.splitTextToSize(insight.summary, pageW - margin * 2 - 16);
  doc.setFillColor(238, 246, 255);
  doc.roundedRect(margin, y - 4, pageW - margin * 2, 16 * summaryLines.length + 16, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text('Auto-generated insight', margin + 10, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);
  doc.text(summaryLines, margin + 10, y + 24);
  y += 16 * summaryLines.length + 30;

  ensure(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('Locality price ranking', margin, y);
  y += 8;
  doc.setDrawColor(...SOFT);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  const byLocality = new Map<string, { n: number; avg: number; min: number; max: number; avgDist: number }>();
  for (const p of properties) {
    const e = byLocality.get(p.locality) ?? { n: 0, avg: 0, min: Infinity, max: -Infinity, avgDist: 0 };
    e.n += 1; e.min = Math.min(e.min, p.price_inr); e.max = Math.max(e.max, p.price_inr);
    e.avg += p.price_inr; e.avgDist += p.distance_to_tata_steel_km ?? 0;
    byLocality.set(p.locality, e);
  }
  const rows = Array.from(byLocality.entries())
    .map(([loc, v]) => ({ loc, n: v.n, avg: v.avg / v.n, min: v.min, max: v.max, avgDist: v.avgDist / v.n }))
    .sort((a, b) => b.avg - a.avg);

  const cols = [
    { name: 'Locality', x: margin + 6 },
    { name: 'Listings', x: margin + 150 },
    { name: 'Avg price', x: margin + 220 },
    { name: 'Min - Max', x: margin + 320 },
    { name: 'Avg dist', x: pageW - margin - 6 },
  ];
  doc.setFillColor(...SOFT);
  doc.rect(margin, y - 12, pageW - margin * 2, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  cols.forEach((c) => {
    const align = c.name === 'Locality' ? 'left' : c.name === 'Avg dist' ? 'right' : 'left';
    doc.text(c.name.toUpperCase(), c.x, y + 3, { align });
  });
  y += 22;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  rows.forEach((r, i) => {
    ensure(20);
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 12, pageW - margin * 2, 18, 'F');
    }
    doc.text(r.loc, cols[0].x, y + 3);
    doc.text(`${r.n}`, cols[1].x, y + 3);
    doc.text(formatINR(r.avg), cols[2].x, y + 3);
    doc.text(`${formatINR(r.min)} - ${formatINR(r.max)}`, cols[3].x, y + 3);
    doc.text(formatKm(r.avgDist), cols[4].x, y + 3, { align: 'right' });
    y += 18;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      'LandLogic — demo dataset. Distances via haversine to Tata Steel Jamshedpur Works.',
      margin,
      doc.internal.pageSize.getHeight() - 18,
    );
    doc.text(`Page ${i} / ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 18, { align: 'right' });
  }

  return doc.output('arraybuffer') as unknown as Uint8Array;
}
