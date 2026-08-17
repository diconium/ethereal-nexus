import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  projectAiSearchApps,
  projectAiSearchAppApiSettings,
} from '@/data/ai/schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import { HttpStatus } from '@/app/api/utils';
import { logger } from '@/lib/logger';
import { decryptCredentials } from '@/lib/credentials-encryption';
import { performVertexSuggestions } from '@/lib/ai-providers/google-vertex-search';
import {
  buildSearchAllowedHeaders,
  buildSearchCorsHeaders,
  DEFAULT_SEARCH_CORS_HEADERS,
  isSearchOriginAllowed,
} from '@/lib/public-search-cors';
import {
  buildIdentityResolution,
  checkRateLimit,
  getSessionCookieIdentifier,
  getTemporaryBlock,
  registerViolationAndMaybeBlock,
} from '@/lib/rate-limit';

type RouteContext = {
  params: Promise<{ publicSlug: string }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;

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
    (rows[0]?.settings?.allowed_origins as string[]) ??
    DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins;

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...buildSearchCorsHeaders(
        allowedOrigins as string[],
        request,
        undefined,
        'GET, OPTIONS',
      ),
      'Access-Control-Allow-Headers': buildSearchAllowedHeaders(
        rows[0]?.settings ?? undefined,
      ),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ---------------------------------------------------------------------------
// GET — autocomplete suggestions
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const trimmedQuery = query.trim();

  // Look up the search app first so we can build CORS headers for every response,
  // including the early-return for empty/short queries.
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
    .where(
      and(
        eq(projectAiSearchApps.public_slug, publicSlug),
        eq(projectAiSearchApps.enabled, true),
      ),
    )
    .limit(1);

  if (!rows[0]?.searchApp) {
    return NextResponse.json(
      { error: 'Search app not found.' },
      { status: HttpStatus.NOT_FOUND, headers: DEFAULT_SEARCH_CORS_HEADERS },
    );
  }

  const searchApp = rows[0].searchApp;
  const allowedOrigins =
    (rows[0].settings?.allowed_origins as string[]) ??
    DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins;

  const apiSettings =
    rows[0].settings ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES;
  const corsHeaders = buildSearchCorsHeaders(
    allowedOrigins as string[],
    request,
    buildSearchAllowedHeaders(apiSettings),
    'GET, OPTIONS',
  );

  // CORS check
  if (!isSearchOriginAllowed(allowedOrigins, request)) {
    return NextResponse.json(
      { error: 'Origin not allowed.' },
      {
        status: HttpStatus.FORBIDDEN,
        headers: corsHeaders,
      },
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
    : identityResolution.identities[0]?.key || null;
  const temporaryBlockIdentities = [
    ...identityResolution.identities,
    ...(sessionCapIdentityKey &&
    !identityResolution.identities.some(
      (identity) => identity.key === sessionCapIdentityKey,
    )
      ? [{ source: 'session' as const, key: sessionCapIdentityKey }]
      : []),
  ];

  if (apiSettings.temporary_block_enabled) {
    for (const identity of temporaryBlockIdentities) {
      const block = await getTemporaryBlock(`${scopeKey}:${identity.key}`);
      if (block.blocked) {
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

  if (
    apiSettings.query_size_limit_enabled &&
    trimmedQuery.length > apiSettings.max_query_characters
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

  if (apiSettings.session_request_cap_enabled && sessionCapIdentityKey) {
    const capResult = await checkRateLimit({
      key: `${scopeKey}:${sessionCapIdentityKey}:session-cap`,
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

  // Empty, whitespace-only, or single-character queries do not call Discovery
  // Engine, but still pass through the same abuse controls as real suggestions.
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return NextResponse.json({ suggestions: [] }, { headers: corsHeaders });
  }

  try {
    const suggestions = await performVertexSuggestions({
      providerConfig: searchApp.provider_config,
      credentialsJson: searchApp.credentials_json
        ? decryptCredentials(searchApp.credentials_json)
        : null,
      query: trimmedQuery,
    });
    return NextResponse.json({ suggestions }, { headers: corsHeaders });
  } catch (err) {
    logger.error('Autocomplete fetch error', err as Error, { publicSlug });
    return NextResponse.json({ suggestions: [] }, { headers: corsHeaders });
  }
}
