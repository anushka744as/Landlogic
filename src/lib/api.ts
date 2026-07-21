import { supabase } from './supabase';
import type { Property } from '../types/property';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token ?? supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface PropertyFilters {
  search?: string;
  locality?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_beds?: number;
  sort?: 'distance' | 'price_asc' | 'price_desc' | 'value_desc' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export interface PropertyListResponse {
  data: Property[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function toQuery(filters: PropertyFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const propertiesApi = {
  async list(filters: PropertyFilters = {}): Promise<PropertyListResponse> {
    const res = await fetch(`${FUNCTIONS_URL}/properties${toQuery(filters)}`, {
      headers: await authHeaders(),
    });
    return handle<PropertyListResponse>(res);
  },

  async get(id: string): Promise<{ data: Property }> {
    const res = await fetch(`${FUNCTIONS_URL}/properties/${id}`, { headers: await authHeaders() });
    return handle(res);
  },

  async create(input: Partial<Property>): Promise<{ data: Property }> {
    const res = await fetch(`${FUNCTIONS_URL}/properties`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return handle(res);
  },

  async update(id: string, input: Partial<Property>): Promise<{ data: Property }> {
    const res = await fetch(`${FUNCTIONS_URL}/properties/${id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return handle(res);
  },

  async remove(id: string): Promise<{ data: { id: string; deleted: boolean } }> {
    const res = await fetch(`${FUNCTIONS_URL}/properties/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return handle(res);
  },
};

export interface AnalyticsSummary {
  totalListings: number;
  avgPrice: number;
  avgPricePerSqft: number;
  avgDistanceKm: number;
  localitiesCovered: number;
  avgRentalYield: number;
  jrei: number;
  jreiChange: number;
  jreiTrend: 'up' | 'down' | 'flat';
}

export const analyticsApi = {
  async summary(): Promise<{ data: AnalyticsSummary }> {
    const res = await fetch(`${FUNCTIONS_URL}/analytics/summary`, { headers: await authHeaders() });
    return handle(res);
  },
  async byLocality() {
    const res = await fetch(`${FUNCTIONS_URL}/analytics/by-locality`, { headers: await authHeaders() });
    return handle(res);
  },
  async proximity(threshold = 3, metric: 'price' | 'rate' = 'price') {
    const res = await fetch(
      `${FUNCTIONS_URL}/analytics/proximity?threshold=${threshold}&metric=${metric}`,
      { headers: await authHeaders() },
    );
    return handle(res);
  },
  async priceBands() {
    const res = await fetch(`${FUNCTIONS_URL}/analytics/price-bands`, { headers: await authHeaders() });
    return handle(res);
  },
  async timeseries() {
    const res = await fetch(`${FUNCTIONS_URL}/analytics/timeseries`, { headers: await authHeaders() });
    return handle(res);
  },
};

export const reportApi = {
  /** Downloads the server-generated PDF report and triggers a browser save. */
  async download(filters: { threshold?: number; metric?: 'price' | 'rate' } & PropertyFilters = {}): Promise<void> {
    const res = await fetch(`${FUNCTIONS_URL}/report${toQuery(filters)}`, {
      headers: await authHeaders(),
    });
    if (!res.ok) {
      let message = `Report generation failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `landlogic-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
