type FingerprintSettings = {
  rate_limit_use_fingerprint?: boolean;
  fingerprint_header_name?: string | null;
};

export const DEFAULT_SEARCH_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function buildSearchAllowedHeaders(settings?: FingerprintSettings) {
  const headers = ['Content-Type'];
  const headerName = settings?.fingerprint_header_name?.trim();
  if (
    settings?.rate_limit_use_fingerprint &&
    headerName &&
    /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(headerName)
  ) {
    headers.push(headerName);
  }
  return headers.join(', ');
}

export function isSearchOriginAllowed(
  allowedOrigins: string[],
  request: Request,
): boolean {
  const requestOrigin = request.headers.get('origin');
  if (!allowedOrigins.length) return true;
  // Same-origin GET requests commonly omit Origin. CORS only governs requests
  // that include it, so an absent header must not block dashboard demos.
  if (!requestOrigin) return true;

  // Dashboard demos use the public endpoint from the same origin. This is not
  // an external CORS grant and must work even when only external origins exist.
  return (
    requestOrigin === new URL(request.url).origin ||
    allowedOrigins.includes(requestOrigin)
  );
}

export function buildSearchCorsHeaders(
  allowedOrigins: string[],
  request: Request,
  allowedHeaders = 'Content-Type',
  methods = 'GET, POST, OPTIONS',
): Record<string, string> {
  const requestOrigin = request.headers.get('origin');
  if (!allowedOrigins.length) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': allowedHeaders,
    };
  }

  if (requestOrigin && isSearchOriginAllowed(allowedOrigins, request)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': allowedHeaders,
      Vary: 'Origin',
    };
  }

  return { Vary: 'Origin' };
}
