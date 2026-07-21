import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, LayersControl, Tooltip } from 'react-leaflet';
import { Map as MapIcon, Factory, Layers, Building2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../types/property';
import { formatINR, formatKm, priceBandFor, PRICE_BANDS, TATA_STEEL_COORDS, markerSizeFor } from '../types/property';
import { Card, EmptyState, PageHeader } from '../components/ui';
import { useTheme } from '../hooks/useTheme';

const { BaseLayer } = LayersControl;

function factoryIcon(color: string, dark: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.55))">
      <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid ${dark ? '#0b1220' : 'white'};display:grid;place-items:center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
          <path d="M6 18h2M11 18h2M16 18h2"/>
        </svg>
      </div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

/**
 * Teardrop pin sized by price. Expensive listings get larger, more saturated
 * pins so they visually dominate the map.
 */
function pricePinIcon(priceInr: number, dark: boolean): L.DivIcon {
  const band = priceBandFor(priceInr);
  const size = markerSizeFor(priceInr);
  const w = size;
  const h = size * 1.4;
  const stroke = dark ? '#0b1220' : '#ffffff';
  return L.divIcon({
    className: '',
    html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45))">
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <path d="M${w / 2} ${h - 1} L${w * 0.18} ${(h - w / 2) * 0.9} A${w / 2} ${w / 2} 0 1 1 ${w * 0.82} ${(h - w / 2) * 0.9} Z"
              fill="${band.fillColor}" stroke="${band.color}" stroke-width="2"/>
        <circle cx="${w / 2}" cy="${w / 2 * 0.95}" r="${w / 5}" fill="${stroke}" opacity="0.95"/>
      </svg>
    </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 1],
    popupAnchor: [0, -h + 6],
  });
}

const RADII = [
  { km: 1, color: '#dc2626', fill: '#fca5a5' },
  { km: 3, color: '#f59e0b', fill: '#fcd34d' },
  { km: 5, color: '#0284c7', fill: '#7dd3fc' },
];

export default function MapPage({ properties, loading }: { properties: Property[]; loading: boolean }) {
  const [showProximity, setShowProximity] = useState(true);
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const visible = useMemo(
  () =>
    properties.filter(
      (p) =>
        p.latitude != null &&
        p.longitude != null &&
        (bandFilter ? priceBandFor(p.price_inr).label === bandFilter : true),
    ),
  [properties, bandFilter],
);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of properties) {
      const b = priceBandFor(p.price_inr).label;
      m.set(b, (m.get(b) ?? 0) + 1);
    }
    return m;
  }, [properties]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Map view"
        title="Jamshedpur Property Map"
        subtitle="Explore listings geographically. Pin size scales with price, so expensive properties stand out. Toggle concentric radius zones around Tata Steel to visualise the proximity premium."
        icon={<MapIcon className="h-6 w-6" strokeWidth={2.2} />}
      />

      {loading ? (
        <EmptyState message="Loading map…" />
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <Card className="overflow-hidden p-0 animate-fade-in-up">
            <div className="h-[560px] w-full">
              <MapContainer
                center={[TATA_STEEL_COORDS.lat, TATA_STEEL_COORDS.lng]}
                zoom={12}
                scrollWheelZoom
                className="h-full w-full"
              >
                <LayersControl position="topright">
                  <BaseLayer checked name={dark ? 'Dark' : 'Streets'}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url={
                        dark
                          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                      }
                    />
                  </BaseLayer>
                  <BaseLayer name="Satellite">
                    <TileLayer
                      attribution='Tiles &copy; Esri'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  </BaseLayer>
                </LayersControl>

                {showProximity &&
                  RADII.map((r) => (
                    <Circle
                      key={r.km}
                      center={[TATA_STEEL_COORDS.lat, TATA_STEEL_COORDS.lng]}
                      radius={r.km * 1000}
                      pathOptions={{ color: r.color, weight: 2, fillColor: r.fill, fillOpacity: 0.10, dashArray: '6 6' }}
                    >
                      <Tooltip sticky direction="top">{r.km} km radius</Tooltip>
                    </Circle>
                  ))}

                <Marker position={[TATA_STEEL_COORDS.lat, TATA_STEEL_COORDS.lng]} icon={factoryIcon('#111827', dark)} zIndexOffset={1000}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold flex items-center gap-1.5"><Factory className="h-4 w-4" /> Tata Steel Jamshedpur Works</div>
                      <div className="text-ink-500 dark:text-ink-400 mt-1">22.7925°N, 86.1842°E</div>
                      <div className="text-ink-600 dark:text-ink-300 mt-2 max-w-[200px]">Reference point for the <span className="font-mono">distance_to_tata_steel_km</span> computed field.</div>
                    </div>
                  </Popup>
                </Marker>

                {visible.map((p) => (
                  <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pricePinIcon(p.price_inr, dark)}>
                    <Popup>
                      <div className="text-sm min-w-[200px]">
                        <div className="font-bold text-ink-900 dark:text-white">{p.title}</div>
                        <div className="text-ink-500 dark:text-ink-400 text-xs mt-0.5">{p.locality} · {p.property_type}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-display font-extrabold text-brand-700 dark:text-brand-300">{formatINR(p.price_inr)}</span>
                          <span className="text-xs text-ink-500 dark:text-ink-400">{p.price_per_sqft != null ? `₹${p.price_per_sqft.toLocaleString('en-IN')}/sqft` : '—'}</span>
                        </div>
                        <div className="mt-2 rounded-md bg-brand-50 dark:bg-brand-900/40 px-2 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                          <Factory className="h-3.5 w-3.5" /> {formatKm(p.distance_to_tata_steel_km)} to Tata Steel
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-ink-900 dark:text-white font-display font-bold text-lg">
                <Layers className="h-5 w-5 text-brand-600 dark:text-brand-400" /> Tata Steel proximity
              </div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Draw concentric 1 / 3 / 5 km radius zones from the works.</p>

              <label className="mt-4 flex items-center justify-between gap-3 cursor-pointer rounded-xl bg-ink-50 dark:bg-ink-700/50 px-4 py-3 ring-1 ring-ink-100 dark:ring-ink-700">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-ink-600 dark:text-ink-300" />
                  <span className="font-semibold text-ink-800 dark:text-ink-100 text-sm">Show Tata Steel Proximity</span>
                </div>
                <Toggle checked={showProximity} onChange={setShowProximity} />
              </label>

              {showProximity && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  {RADII.map((r) => (
                    <div key={r.km} className="flex items-center justify-between text-sm rounded-lg px-3 py-2 bg-white dark:bg-ink-700/50 ring-1 ring-ink-100 dark:ring-ink-700">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full ring-2" style={{ background: r.fill, borderColor: r.color, boxShadow: `inset 0 0 0 1.5px ${r.color}` }} />
                        <span className="font-semibold text-ink-800 dark:text-ink-100">{r.km} km radius</span>
                      </span>
                      <span className="text-xs text-ink-500 dark:text-ink-400">
                        {properties.filter((p) => (p.distance_to_tata_steel_km ?? 99) <= r.km).length} listings
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-ink-900 dark:text-white font-display font-bold text-lg">
                <Building2 className="h-5 w-5 text-brand-600 dark:text-brand-400" /> Price bands
              </div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Filter markers by asking-price band.</p>

              <div className="mt-3 space-y-2">
                <BandRow label="All bands" count={properties.length} active={bandFilter === null} onClick={() => setBandFilter(null)} swatch={null} />
                {PRICE_BANDS.map((b) => (
                  <BandRow
                    key={b.label}
                    label={b.label}
                    count={counts.get(b.label) ?? 0}
                    active={bandFilter === b.label}
                    onClick={() => setBandFilter(bandFilter === b.label ? null : b.label)}
                    swatch={b.fillColor}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs text-ink-400 dark:text-ink-400 leading-relaxed">
                <span className="font-semibold text-ink-600 dark:text-ink-300">Pin size = price.</span> Larger, more saturated pins mark pricier listings. Use the layer switcher (top-right) to toggle satellite imagery. Click any pin for details including its <span className="font-mono text-ink-600 dark:text-ink-300">distance_to_tata_steel_km</span>.
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${checked ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-600'}`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

function BandRow({
  label,
  count,
  active,
  onClick,
  swatch,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  swatch: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ring-1 ${
        active
          ? 'bg-brand-50 dark:bg-brand-900/40 ring-brand-200 dark:ring-brand-700 text-brand-800 dark:text-brand-200'
          : 'bg-white dark:bg-ink-700/50 ring-ink-100 dark:ring-ink-700 hover:bg-ink-50 dark:hover:bg-ink-700 text-ink-800 dark:text-ink-100'
      }`}
    >
      <span className="flex items-center gap-2 font-semibold">
        {swatch ? <span className="h-3 w-3 rounded-full" style={{ background: swatch }} /> : <span className="h-3 w-3 rounded-full ring-1 ring-ink-200 dark:ring-ink-600" />}
        {label}
      </span>
      <span className="text-xs text-ink-500 dark:text-ink-400">{count}</span>
    </button>
  );
}
