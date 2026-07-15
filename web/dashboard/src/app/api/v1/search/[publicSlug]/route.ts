import { NextRequest, NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { db } from '@/db';
import {
  projectAiSearchApps,
  projectAiSearchAppApiSettings,
} from '@/data/ai/schema';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import { and, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import {
  buildIdentityResolution,
  checkRateLimit,
  getClientIp,
  getSessionCookieIdentifier,
  getTemporaryBlock,
  registerViolationAndMaybeBlock,
} from '@/lib/rate-limit';
import { performVertexSearch } from '@/lib/ai-providers/google-vertex-search';
import { decryptCredentials } from '@/lib/credentials-encryption';

type RouteContext = {
  params: Promise<{
    publicSlug: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

/**
 * Permissive fallback headers used for responses that fire before per-app
 * settings are loaded (e.g. 404 "not found").  Without these, browsers block
 * cross-origin scripts from reading the error body entirely.
 */
const DEFAULT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildCorsHeaders(
  allowedOrigins: string[],
  requestOrigin: string | null,
): Record<string, string> {
  if (!allowedOrigins.length) {
    // No restriction configured — allow all origins
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
  }

  // Origin not in allowed list — return headers that will cause the browser
  // to block the request (no Allow-Origin header).
  return { Vary: 'Origin' };
}

function isCorsAllowed(
  allowedOrigins: string[],
  requestOrigin: string | null,
): boolean {
  if (!allowedOrigins.length) return true; // No restriction
  if (!requestOrigin) return false; // Origin required when list is non-empty
  return allowedOrigins.includes(requestOrigin);
}

// ---------------------------------------------------------------------------
// OPTIONS — preflight
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;
  const requestOrigin = request.headers.get('origin');

  const rows = await db
    .select({ settings: projectAiSearchAppApiSettings })
    .from(projectAiSearchApps)
    .leftJoin(
      projectAiSearchAppApiSettings,
      eq(projectAiSearchAppApiSettings.search_app_id, projectAiSearchApps.id),
    )
    .where(eq(projectAiSearchApps.public_slug, publicSlug))
    .limit(1);

  const allowedOrigins =
    rows[0]?.settings?.allowed_origins ??
    DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins;

  const corsHeaders = buildCorsHeaders(
    allowedOrigins as string[],
    requestOrigin,
  );

  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
  });
}

// ---------------------------------------------------------------------------
// POST — search
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;
  const clientIp = getClientIp(request);
  const requestOrigin = request.headers.get('origin');

  logger.info('Search request received', {
    route: 'search-public',
    publicSlug,
    method: request.method,
    clientIp,
    origin: requestOrigin,
  });

  // ------------------------------------------------------------------
  // 1. Lookup search app
  // ------------------------------------------------------------------
  const rows = await db
    .select({
      searchApp: projectAiSearchApps,
      settings: projectAiSearchAppApiSettings,
    })
    .from(projectAiSearchApps)
    .leftJoin(
      projectAiSearchAppApiSettings,
      eq(projectAiSearchAppApiSettings.search_app_id, projectAiSearchApps.id),
    )
    .where(eq(projectAiSearchApps.public_slug, publicSlug))
    .limit(1);

  const row = rows[0];
  const searchApp = row?.searchApp;
  const apiSettings = row?.settings ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES;

  if (!searchApp) {
    logger.warn('Search app not found', { route: 'search-public', publicSlug });
    return NextResponse.json(
      { error: 'Search app not found.' },
      { status: HttpStatus.NOT_FOUND, headers: DEFAULT_CORS_HEADERS },
    );
  }

  if (!searchApp.enabled) {
    logger.warn('Disabled search app requested', {
      route: 'search-public',
      publicSlug,
      searchAppId: searchApp.id,
    });
    return NextResponse.json(
      { error: 'Search app not found.' },
      { status: HttpStatus.NOT_FOUND, headers: DEFAULT_CORS_HEADERS },
    );
  }

  const allowedOrigins = (apiSettings.allowed_origins ?? []) as string[];
  const corsHeaders = buildCorsHeaders(allowedOrigins, requestOrigin);

  // ------------------------------------------------------------------
  // 2. CORS / Allowed origins check
  // ------------------------------------------------------------------
  if (!isCorsAllowed(allowedOrigins, requestOrigin)) {
    logger.warn('Search request from disallowed origin', {
      route: 'search-public',
      publicSlug,
      origin: requestOrigin,
      allowedOrigins,
    });
    return NextResponse.json(
      { error: 'Origin not allowed.' },
      { status: HttpStatus.FORBIDDEN, headers: corsHeaders },
    );
  }

  const scopeKey = `search:${publicSlug}`;

  const identityResolution = buildIdentityResolution(request, {
    useIp: apiSettings.rate_limit_use_ip,
    useSessionCookie: apiSettings.rate_limit_use_session_cookie,
    useFingerprint: apiSettings.rate_limit_use_fingerprint,
    fingerprintHeaderName: apiSettings.fingerprint_header_name,
  });

  const sessionIdentityKey = getSessionCookieIdentifier(request);
  const sessionCapIdentityKey = sessionIdentityKey
    ? `session:${sessionIdentityKey}`
    : null;

  // ------------------------------------------------------------------
  // 3. Temporary block check
  // ------------------------------------------------------------------
  if (apiSettings.temporary_block_enabled) {
    for (const identity of identityResolution.identities) {
      const block = await getTemporaryBlock(`${scopeKey}:${identity.key}`);
      if (block.blocked) {
        logger.warn('Search request temporarily blocked', {
          route: 'search-public',
          publicSlug,
          identitySource: identity.source,
          resetSeconds: block.resetSeconds,
        });
        return NextResponse.json(
          { error: 'Too many requests. Temporary block active.' },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Retry-After': String(block.resetSeconds),
            },
          },
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // 4. Sliding-window rate limit
  // ------------------------------------------------------------------
  if (apiSettings.rate_limit_enabled) {
    for (const identity of identityResolution.identities) {
      const rateLimit = await checkRateLimit({
        key: `${scopeKey}:${identity.key}:window`,
        limit: apiSettings.rate_limit_max_requests,
        windowSeconds: apiSettings.rate_limit_window_seconds,
      });

      if (!rateLimit.allowed) {
        if (apiSettings.temporary_block_enabled) {
          await registerViolationAndMaybeBlock({
            key: `${scopeKey}:${identity.key}`,
            threshold: apiSettings.temporary_block_violation_threshold,
            violationWindowSeconds: apiSettings.temporary_block_window_seconds,
            blockDurationSeconds: apiSettings.temporary_block_duration_seconds,
          });
        }

        logger.warn('Search rate limit exceeded', {
          route: 'search-public',
          publicSlug,
          identitySource: identity.source,
          current: rateLimit.current,
          limit: apiSettings.rate_limit_max_requests,
        });

        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Retry-After': String(rateLimit.resetSeconds),
              'X-RateLimit-Limit': String(apiSettings.rate_limit_max_requests),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetSeconds),
            },
          },
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // 5. Body size check
  // ------------------------------------------------------------------
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { error: 'Failed to read request body.' },
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders },
    );
  }

  const requestBodyBytes = Buffer.byteLength(rawText, 'utf8');

  if (
    apiSettings.query_size_limit_enabled &&
    requestBodyBytes > apiSettings.max_request_body_bytes
  ) {
    if (apiSettings.temporary_block_enabled) {
      for (const identity of identityResolution.identities) {
        await registerViolationAndMaybeBlock({
          key: `${scopeKey}:${identity.key}`,
          threshold: apiSettings.temporary_block_violation_threshold,
          violationWindowSeconds: apiSettings.temporary_block_window_seconds,
          blockDurationSeconds: apiSettings.temporary_block_duration_seconds,
        });
      }
    }

    return NextResponse.json(
      { error: 'Request body too large.' },
      { status: 413, headers: corsHeaders },
    );
  }

  // ------------------------------------------------------------------
  // 6. JSON parse + body validation
  // ------------------------------------------------------------------
  let body: { query?: unknown; pageSize?: unknown; includeSummary?: unknown };
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders },
    );
  }

  if (typeof body.query !== 'string' || !body.query.trim()) {
    return NextResponse.json(
      { error: 'Missing or empty query string.' },
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders },
    );
  }

  const query = body.query.trim();

  // ------------------------------------------------------------------
  // 7. Query character limit
  // ------------------------------------------------------------------
  if (
    apiSettings.query_size_limit_enabled &&
    query.length > apiSettings.max_query_characters
  ) {
    if (apiSettings.temporary_block_enabled) {
      for (const identity of identityResolution.identities) {
        await registerViolationAndMaybeBlock({
          key: `${scopeKey}:${identity.key}`,
          threshold: apiSettings.temporary_block_violation_threshold,
          violationWindowSeconds: apiSettings.temporary_block_window_seconds,
          blockDurationSeconds: apiSettings.temporary_block_duration_seconds,
        });
      }
    }

    return NextResponse.json(
      {
        error: `Query exceeds maximum length of ${apiSettings.max_query_characters} characters.`,
      },
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders },
    );
  }

  // ------------------------------------------------------------------
  // 8. Page size — clamp to configured bounds
  // ------------------------------------------------------------------
  const requestedPageSize =
    typeof body.pageSize === 'number' && body.pageSize > 0
      ? body.pageSize
      : searchApp.page_size;
  const pageSize = Math.min(requestedPageSize, searchApp.page_size_max);

  // ------------------------------------------------------------------
  // 9. Session request cap
  // ------------------------------------------------------------------
  if (apiSettings.session_request_cap_enabled && sessionCapIdentityKey) {
    const capKey = `${scopeKey}:${sessionCapIdentityKey}:session-cap`;
    const capResult = await checkRateLimit({
      key: capKey,
      limit: apiSettings.session_request_cap_max_requests,
      windowSeconds: apiSettings.session_request_cap_window_seconds,
    });

    if (!capResult.allowed) {
      if (apiSettings.temporary_block_enabled) {
        await registerViolationAndMaybeBlock({
          key: `${scopeKey}:${sessionCapIdentityKey}`,
          threshold: apiSettings.temporary_block_violation_threshold,
          violationWindowSeconds: apiSettings.temporary_block_window_seconds,
          blockDurationSeconds: apiSettings.temporary_block_duration_seconds,
        });
      }

      return NextResponse.json(
        { error: 'Session request cap exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'X-Ethereal-Limit-Type': 'session-cap',
            'X-Ethereal-Limit': String(
              apiSettings.session_request_cap_max_requests,
            ),
            'X-Ethereal-Remaining': String(capResult.remaining),
            'X-Ethereal-Reset': String(capResult.resetSeconds),
          },
        },
      );
    }
  }

  // ------------------------------------------------------------------
  // 10. Perform search
  // ------------------------------------------------------------------
  try {
    const searchResponse = await performVertexSearch({
      providerConfig: searchApp.provider_config,
      credentialsJson: searchApp.credentials_json
        ? decryptCredentials(searchApp.credentials_json)
        : null,
      searchQuery: query,
      pageSize,
      includeSummary: body.includeSummary === true,
    });

    logger.info('Search request completed successfully', {
      route: 'search-public',
      publicSlug,
      queryLength: query.length,
      resultCount: searchResponse.results.length,
    });

    return NextResponse.json(
      {
        results: searchResponse.results,
        totalSize: searchResponse.totalSize,
        summary: searchResponse.summary ?? null,
        query,
        pageSize,
      },
      { status: HttpStatus.OK, headers: corsHeaders },
    );
  } catch (error) {
    logger.error(
      'Search provider error',
      error instanceof Error ? error : new Error(String(error)),
      {
        route: 'search-public',
        publicSlug,
        queryLength: query.length,
      },
    );

    return NextResponse.json(
      { error: 'Search failed. Please try again later.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR, headers: corsHeaders },
    );
  }
}
