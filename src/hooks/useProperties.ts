import { useCallback, useEffect, useState } from 'react';
import { propertiesApi } from '../lib/api';
import type { Property } from '../types/property';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      // Pull the full dataset (all pages) for the client-side charts/map/table.
      // The backend still supports server-side search/filter/pagination for
      // callers that want it (see propertiesApi.list filters).
      const limit = 100;
      let page = 1;
      let all: Property[] = [];
      for (;;) {
        const { data, pagination } = await propertiesApi.list({ page, limit, sort: 'distance' });
        all = all.concat(data);
        if (page >= pagination.totalPages) break;
        page += 1;
      }
      setProperties(all);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { properties, loading, error, refetch };
}
