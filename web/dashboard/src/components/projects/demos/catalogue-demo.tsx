'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Folder, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  catalogueDataSchema,
  EMPTY_CATALOGUE_DATA,
  type CatalogueData,
  type CatalogueItem,
  type FacetValue,
} from '@/data/ai/catalogue';

type Filters = Record<string, Set<string>>;

function emptyFiltersFrom(facets: Record<string, FacetValue[]>): Filters {
  const filters: Filters = {};
  for (const key of Object.keys(facets)) {
    filters[key] = new Set();
  }
  return filters;
}

function facetLabel(key: string) {
  const spaced = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function CatalogueDemo({
  projectId,
  environmentId,
  catalogue,
}: {
  projectId: string;
  environmentId: string;
  catalogue: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
}) {
  const [data, setData] = useState<CatalogueData>(EMPTY_CATALOGUE_DATA);
  const [filters, setFilters] = useState<Filters>(() =>
    emptyFiltersFrom(EMPTY_CATALOGUE_DATA.facets),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/v1/projects/${projectId}/environments/${environmentId}/catalogues/${catalogue.slug}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        const payload = (await response.json()) as { data?: unknown };
        const parsed = catalogueDataSchema.safeParse(payload.data);
        if (!parsed.success) {
          throw new Error('Catalogue API returned invalid data.');
        }

        if (!cancelled) {
          setData(parsed.data);
          setFilters(emptyFiltersFrom(parsed.data.facets));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to fetch catalogue.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const facetKeys = useMemo(() => Object.keys(data.facets), [data.facets]);

  const filteredItems = useMemo(
    () =>
      data.items.filter((item) => {
        for (const key of facetKeys) {
          const selected = filters[key];
          if (!selected || selected.size === 0) {
            continue;
          }
          const value = item.attributes[key];
          if (value === undefined || value === null) {
            continue;
          }
          const values = Array.isArray(value) ? value : [String(value)];
          if (!values.some((candidate) => selected.has(candidate))) {
            return false;
          }
        }
        return true;
      }),
    [data.items, facetKeys, filters],
  );

  const toggleFilter = (group: string, value: string) => {
    setFilters((current) => {
      const next: Filters = {};
      for (const key of Object.keys(current)) {
        next[key] = new Set(current[key]);
      }
      if (!next[group]) {
        next[group] = new Set();
      }
      if (next[group].has(value)) {
        next[group].delete(value);
      } else {
        next[group].add(value);
      }
      return next;
    });
  };

  const clearFilters = () => setFilters(emptyFiltersFrom(data.facets));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/projects/${projectId}/ai/catalogues?env=${environmentId}`}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Back to catalogues
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{catalogue.name}</h2>
              <Badge variant="outline" className="gap-1">
                <Folder className="size-3.5" />
                Catalogue demo
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {catalogue.description ||
                'Preview catalogue data returned by the configured API endpoint.'}
            </p>
            <p className="text-xs text-muted-foreground">
              GET <code>{endpoint}</code>
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" />
          Reload data
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {loading ? <Badge variant="outline">Loading</Badge> : null}
        {error ? <Badge variant="destructive">Fetch error</Badge> : null}
        {!loading ? (
          <Badge variant="outline">
            {filteredItems.length} / {data.items.length} items
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
            {facetKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No facets available.
              </p>
            ) : (
              facetKeys.map((key) => (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-medium">{facetLabel(key)}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.facets[key].map((facet) => {
                      const selected = filters[key]?.has(facet.value) ?? false;
                      return (
                        <button
                          key={`${key}-${facet.value}`}
                          type="button"
                          onClick={() => toggleFilter(key, facet.value)}
                          className={
                            selected
                              ? 'rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs text-primary'
                              : 'rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                          }
                        >
                          {facet.value} ({facet.count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-56 animate-pulse rounded-xl border bg-muted/30"
                />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}

          {!loading && !error && filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              {data.items.length === 0
                ? 'This catalogue has no published items yet.'
                : 'No items match the selected filters.'}
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredItems.map((item) => (
                <CatalogueItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CatalogueItemCard({ item }: { item: CatalogueItem }) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>

        {item.features.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Features
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {item.features.slice(0, 4).map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {Object.keys(item.attributes).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(item.attributes).map(([key, value]) => (
              <Badge key={key} variant="outline">
                {facetLabel(key)}:{' '}
                {Array.isArray(value) ? value.join(', ') : (value ?? '-')}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
