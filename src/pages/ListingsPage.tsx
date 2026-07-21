import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Maximize, BedDouble, Bath, Gauge, Factory, ArrowUpDown, Table as TableIcon, LayoutGrid, TrendingUp, TrendingDown, Minus, Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Property } from '../types/property';
import { formatINR, formatKm, priceBandFor, PRICE_BANDS } from '../types/property';
import { Card, EmptyState, KpiTile, PageHeader, SortHeader, StatPill } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { computeDerivedMetrics } from '../lib/analytics';
import { propertiesApi } from '../lib/api';
import { PropertyFormModal } from '../components/PropertyFormModal';

type SortKey = 'distance' | 'price_asc' | 'price_desc' | 'value_desc';
type View = 'grid' | 'table';
type TableSortKey = 'title' | 'locality' | 'price_inr' | 'price_per_sqft' | 'area_sqft' | 'distance_to_tata_steel_km' | 'bedrooms';
type TableDir = 'asc' | 'desc';

export default function ListingsPage({
  properties,
  loading,
  isAdmin = false,
  onChanged = () => {},
}: {
  properties: Property[];
  loading: boolean;
  isAdmin?: boolean;
  onChanged?: () => void;
}) {
  const [locality, setLocality] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('distance');
  const [view, setView] = useState<View>('grid');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [formOpen, setFormOpen] = useState<'create' | Property | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Server-side search — hits the backend /properties?search= endpoint so the
  // API layer's search/filter capability is actually exercised (debounced).
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      propertiesApi
        .list({ search: q, limit: 100 })
        .then((res) => setSearchResults(res.data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const baseList = searchResults ?? properties;

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await propertiesApi.remove(id);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const localities = useMemo(
    () => Array.from(new Set(properties.map((p) => p.locality))).sort(),
    [properties],
  );
  const types = useMemo(
    () => Array.from(new Set(properties.map((p) => p.property_type))).sort(),
    [properties],
  );

  const filtered = useMemo(() => {
    const list = baseList.filter(
      (p) => (locality === 'all' || p.locality === locality) && (type === 'all' || p.property_type === type),
    );
    const sorted = [...list];
    switch (sort) {
      case 'price_asc': sorted.sort((a, b) => a.price_inr - b.price_inr); break;
      case 'price_desc': sorted.sort((a, b) => b.price_inr - a.price_inr); break;
      case 'value_desc': sorted.sort((a, b) => b.price_per_sqft - a.price_per_sqft); break;
      default: sorted.sort((a, b) => (a.distance_to_tata_steel_km ?? 9e9) - (b.distance_to_tata_steel_km ?? 9e9));
    }
    return sorted;
  }, [baseList, locality, type, sort]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return { avgDistance: 0, medianPrice: 0, avgRate: 0 };
    const sortedPrice = [...filtered].map((p) => p.price_inr).sort((a, b) => a - b);
    return {
      avgDistance: filtered.reduce((s, p) => s + (p.distance_to_tata_steel_km ?? 0), 0) / filtered.length,
      medianPrice: sortedPrice[Math.floor(sortedPrice.length / 2)],
      avgRate: filtered.reduce((s, p) => s + p.price_per_sqft, 0) / filtered.length,
    };
  }, [filtered]);

  const derived = useMemo(() => computeDerivedMetrics(filtered), [filtered]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Property listings"
        title="Landlogic"
        subtitle="Every listing is tagged with its great-circle distance to Tata Steel Jamshedpur Works — a key driver of local pricing."
        icon={<Building2 className="h-6 w-6" strokeWidth={2.2} />}
        action={
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-ink-50 dark:bg-ink-800 rounded-lg p-1 border border-ink-100 dark:border-ink-700">
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition ${view === 'grid' ? 'bg-white dark:bg-ink-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white'}`}
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" /> Grid
              </button>
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition ${view === 'table' ? 'bg-white dark:bg-ink-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white'}`}
                aria-pressed={view === 'table'}
              >
                <TableIcon className="h-4 w-4" /> Table
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={() => setFormOpen('create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-glow transition-colors"
              >
                <Plus className="h-4 w-4" /> Add listing
              </button>
            )}
          </div>
        }
      />

      {formOpen && (
        <PropertyFormModal
          initial={formOpen === 'create' ? null : formOpen}
          onClose={() => setFormOpen(null)}
          onSaved={() => {
            setFormOpen(null);
            onChanged();
          }}
        />
      )}

      {/* Search */}
      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-500 animate-spin" />}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings by title or locality…"
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-sm font-medium text-ink-800 dark:text-ink-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition"
          />
        </div>
      </Card>

      {/* KPI strip with gradient + count-up */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiTile label="Total Listings" tone="neutral" numericValue={filtered.length} format={(v) => Math.round(v).toLocaleString('en-IN')} delay={0} />
        <KpiTile label="Avg Price" tone="blue" numericValue={stats.medianPrice} format={(v) => formatINR(v)} delay={60} />
        <KpiTile label="Avg Price / Sq Ft" tone="brand" numericValue={stats.avgRate} format={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`} sub="per sqft" delay={120} />
        <KpiTile label="Localities Covered" tone="green" numericValue={new Set(filtered.map((p) => p.locality)).size} format={(v) => Math.round(v).toString()} delay={180} />
        <KpiTile label="Avg Rental Yield" tone="green" numericValue={derived.avgRentalYield} format={(v) => `${v.toFixed(1)}%`} sub="est. gross annual" delay={240} />
        <JreiTile jrei={derived.jrei} change={derived.jreiChange} trend={derived.jreiTrend} delay={300} />
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="grid sm:grid-cols-3 gap-3 flex-1">
            <Field label="Locality">
              <Select value={locality} onChange={setLocality} options={['all', ...localities]} labels={{ all: 'All localities' }} />
            </Field>
            <Field label="Property type">
              <Select value={type} onChange={setType} options={['all', ...types]} labels={{ all: 'All types' }} />
            </Field>
            <Field label="Sort by">
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full appearance-none pl-9 pr-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-sm font-medium text-ink-800 dark:text-ink-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition"
                >
                  <option value="distance">Distance to Tata Steel (nearest)</option>
                  <option value="price_asc">Price (low → high)</option>
                  <option value="price_desc">Price (high → low)</option>
                  <option value="value_desc">₹/sqft (best value)</option>
                </select>
              </div>
            </Field>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-ink-500 dark:text-ink-400">
            <span className="font-semibold text-ink-600 dark:text-ink-300 mr-1">Price band</span>
            {PRICE_BANDS.map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.fillColor }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Listings */}
      {loading ? (
        <EmptyState message="Loading listings…" />
      ) : filtered.length === 0 ? (
        <EmptyState message="No listings match these filters." />
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <PropertyCard
              key={p.id}
              property={p}
              index={i}
              isAdmin={isAdmin}
              onEdit={() => setFormOpen(p)}
              onDelete={() => handleDelete(p.id)}
              deleting={deletingId === p.id}
            />
          ))}
        </div>
      ) : (
        <PropertiesTable
          properties={filtered}
          isAdmin={isAdmin}
          onEdit={(p) => setFormOpen(p)}
          onDelete={(p) => handleDelete(p.id)}
          deletingId={deletingId}
        />
      )}
    </div>
  );
}

function PropertyCard({
  property: p,
  index,
  isAdmin,
  onEdit,
  onDelete,
  deleting,
}: {
  property: Property;
  index: number;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const band = priceBandFor(p.price_inr);
  return (
    <article
      className="group relative bg-white dark:bg-ink-800 rounded-2xl border border-ink-100 dark:border-ink-700 shadow-card dark:shadow-card-dark hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
    >
      {isAdmin && (
        <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            title="Edit listing"
            className="h-7 w-7 grid place-items-center rounded-lg bg-white/90 hover:bg-white text-ink-700 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Delete listing"
            className="h-7 w-7 grid place-items-center rounded-lg bg-white/90 hover:bg-white text-danger-600 shadow-sm disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <div className="relative h-24 bg-gradient-to-br from-brand-600 to-brand-800 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
        <div className="absolute top-3 left-4 text-white/90 text-xs font-semibold tracking-wide uppercase">{p.property_type}</div>
        <div className="absolute bottom-3 left-4 text-white font-display font-extrabold text-xl drop-shadow-sm">{formatINR(p.price_inr)}</div>
        <div className="absolute bottom-3 right-4 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-sm" style={{ background: band.color }}>{band.label}</div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-ink-900 dark:text-white text-lg leading-snug group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{p.title}</h3>
          <div className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400 text-sm mt-1">
            <MapPin className="h-3.5 w-3.5" /> {p.locality}, Jamshedpur
          </div>
        </div>

        <div className="flex items-stretch gap-3 rounded-xl bg-brand-50/70 dark:bg-brand-900/30 ring-1 ring-brand-100 dark:ring-brand-800 p-3">
          <div className="grid h-9 w-9 rounded-lg bg-brand-600 text-white place-items-center shrink-0">
            <Factory className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/80 dark:text-brand-300/80">Distance to Tata Steel</div>
            <div className="font-display font-extrabold text-brand-800 dark:text-brand-200 text-lg leading-tight">{formatKm(p.distance_to_tata_steel_km)}</div>
          </div>
          <div className="self-center text-right">
            <div className="text-[11px] text-ink-400 dark:text-ink-500 font-medium">great-circle</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-sm">
          <Spec icon={<BedDouble className="h-4 w-4" />} label="Bedrooms" value={p.bedrooms ? `${p.bedrooms} BHK` : 'Plot'} />
          <Spec icon={<Bath className="h-4 w-4" />} label="Bathrooms" value={p.bathrooms ? p.bathrooms.toString() : '—'} />
          <Spec icon={<Maximize className="h-4 w-4" />} label="Area" value={p.area_sqft != null ? `${p.area_sqft.toLocaleString('en-IN')} sqft` : '—'} />
          <Spec icon={<Gauge className="h-4 w-4" />} label="Rate" value={p.price_per_sqft != null ? `₹${p.price_per_sqft.toLocaleString('en-IN')}/sqft` : '—'} />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-ink-100 dark:border-ink-700">
          <StatPill label="Listed" value={p.listed_on ? new Date(p.listed_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          <StatPill label="Lat/Lng" value={p.latitude != null && p.longitude != null ? `${p.latitude.toFixed(3)}, ${p.longitude.toFixed(3)}` : '—'} tone="neutral" />
        </div>
      </div>
    </article>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ink-50/70 dark:bg-ink-700/50 px-2.5 py-2">
      <span className="text-ink-400 dark:text-ink-400">{icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-ink-400 dark:text-ink-500 font-semibold">{label}</div>
        <div className="text-ink-800 dark:text-ink-100 font-semibold text-[13px]">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function JreiTile({
  jrei,
  change,
  trend,
  delay,
}: {
  jrei: number;
  change: number;
  trend: 'up' | 'down' | 'flat';
  delay: number;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const toneClasses =
    trend === 'up'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/40 ring-emerald-100 dark:ring-emerald-800'
      : trend === 'down'
      ? 'text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-900/40 ring-rose-100 dark:ring-rose-800'
      : 'text-ink-500 dark:text-ink-300 bg-ink-50 dark:bg-ink-700/60 ring-ink-100 dark:ring-ink-600';
  const sign = change > 0 ? '+' : '';
  return (
    <div
      className="rounded-2xl border border-ink-100 dark:border-ink-700 p-4 shadow-card dark:shadow-card-dark animate-fade-in-up bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/35 dark:to-ink-800"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">JREI</div>
        <TrendingUp className="h-4 w-4 text-amber-500 dark:text-amber-400" strokeWidth={2.2} />
      </div>
      <div className="mt-1 font-display font-extrabold text-2xl text-amber-700 dark:text-amber-300">
        <CountUp value={jrei} format={(v) => v.toFixed(1)} />
      </div>
      <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${toneClasses}`}>
        <TrendIcon className="h-3 w-3" strokeWidth={2.6} />
        {sign}{change.toFixed(2)}% vs last period
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-sm font-medium text-ink-800 dark:text-ink-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition"
    >
      {options.map((o) => (
        <option key={o} value={o}>{labels?.[o] ?? o}</option>
      ))}
    </select>
  );
}

/* ---------- Sortable properties table ---------- */

function PropertiesTable({
  properties,
  isAdmin,
  onEdit,
  onDelete,
  deletingId,
}: {
  properties: Property[];
  isAdmin?: boolean;
  onEdit?: (p: Property) => void;
  onDelete?: (p: Property) => void;
  deletingId?: string | null;
}) {
  const [sortKey, setSortKey] = useState<TableSortKey>('price_inr');
  const [dir, setDir] = useState<TableDir>('desc');

  const onSort = (key: TableSortKey) => {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDir(key === 'title' || key === 'locality' ? 'asc' : 'desc');
    }
  };

  const rows = useMemo(() => {
    const sorted = [...properties];
    const mul = dir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * mul;
      return ((av as number) - (bv as number)) * mul;
    });
    return sorted;
  }, [properties, sortKey, dir]);

  const col = (label: string, key: TableSortKey, align: 'left' | 'right' = 'right') => (
    <SortHeader
      label={label}
      active={sortKey === key}
      direction={sortKey === key ? dir : 'asc'}
      onClick={() => onSort(key)}
      align={align}
    />
  );

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50/60 dark:bg-ink-700/40 text-ink-500 dark:text-ink-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-semibold w-10">#</th>
              {col('Property', 'title', 'left')}
              {col('Locality', 'locality', 'left')}
              {col('Price', 'price_inr')}
              {col('₹/sqft', 'price_per_sqft')}
              {col('Area (sqft)', 'area_sqft')}
              {col('BHK', 'bedrooms')}
              {col('Dist to Tata Steel', 'distance_to_tata_steel_km')}
              {isAdmin && <th className="text-right px-5 py-3 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
            {rows.map((p, i) => {
              const band = priceBandFor(p.price_inr);
              return (
                <tr key={p.id} className="hover:bg-ink-50/40 dark:hover:bg-ink-700/30 transition-colors">
                  <td className="px-5 py-3 text-ink-400 dark:text-ink-500 font-mono">{i + 1}</td>
                  <td className="px-5 py-3 font-semibold text-ink-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: band.fillColor }} />
                      {p.title}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-600 dark:text-ink-300">{p.locality}</td>
                  <td className="px-5 py-3 text-right font-bold text-ink-900 dark:text-white">{formatINR(p.price_inr)}</td>
                  <td className="px-5 py-3 text-right text-ink-600 dark:text-ink-300">{p.price_per_sqft != null ? `₹${p.price_per_sqft.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-3 text-right text-ink-600 dark:text-ink-300">{p.area_sqft != null ? p.area_sqft.toLocaleString('en-IN') : '—'}</td>
                  <td className="px-5 py-3 text-right text-ink-600 dark:text-ink-300">{p.bedrooms ? `${p.bedrooms} BHK` : 'Plot'}</td>
                  <td className="px-5 py-3 text-right"><StatPill label="" value={formatKm(p.distance_to_tata_steel_km)} tone="brand" /></td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onEdit?.(p)}
                          title="Edit listing"
                          className="h-7 w-7 grid place-items-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete?.(p)}
                          disabled={deletingId === p.id}
                          title="Delete listing"
                          className="h-7 w-7 grid place-items-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-danger-600 disabled:opacity-50"
                        >
                          {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}