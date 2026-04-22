export function normalizeCatalogueApiPath(
  value?: string | null,
  slug?: string | null,
) {
  const raw = value?.trim();

  if (raw) {
    try {
      const parsed = new URL(raw);
      return normalizeCatalogueApiPath(parsed.pathname, slug);
    } catch {
      // fall through for relative paths
    }

    const cleaned = raw.replace(/^\/+/, '');
    if (cleaned.startsWith('api/v1/')) {
      const endpoint = cleaned.slice('api/v1/'.length).split('/')[0];
      return `/api/v1/${endpoint}`;
    }

    const endpoint = cleaned.split('/')[0];
    if (endpoint) {
      return `/api/v1/${endpoint}`;
    }
  }

  if (slug) {
    return `/api/v1/${slug}`;
  }

  return null;
}

export function extractCatalogueEndpointSlug(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = normalizeCatalogueApiPath(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^\/api\/v1\//, '');
}
