import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineAccessToken } from '@/lib/google-discovery-auth';
import { db } from '@/db';
import {
  projectAiSearchApps,
  projectAiSearchAppApiSettings,
} from '@/data/ai/schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import { getVertexSearchConfigOrThrow } from '@/data/ai/provider';
import { HttpStatus } from '@/app/api/utils';
import { logger } from '@/lib/logger';
import { decryptCredentials } from '@/lib/credentials-encryption';
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

const DEFAULT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildAllowedHeaders(settings?: {
  rate_limit_use_fingerprint?: boolean;
  fingerprint_header_name?: string | null;
}) {
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

function buildCorsHeaders(
  allowedOrigins: string[],
  requestOrigin: string | null,
  allowedHeaders = 'Content-Type',
): Record<string, string> {
  if (!allowedOrigins.length) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': allowedHeaders,
    };
  }
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': allowedHeaders,
      Vary: 'Origin',
    };
  }
  return { Vary: 'Origin' };
}

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
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
    (rows[0]?.settings?.allowed_origins as string[]) ??
    DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins;

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...buildCorsHeaders(allowedOrigins as string[], requestOrigin),
      'Access-Control-Allow-Headers': buildAllowedHeaders(
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
  const requestOrigin = request.headers.get('origin');
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
    return NextResponse.json({ error: 'Search app not found.' }, { status: HttpStatus.NOT_FOUND, headers: DEFAULT_CORS_HEADERS });
  }

  const searchApp = rows[0].searchApp;
  const allowedOrigins =
    (rows[0].settings?.allowed_origins as string[]) ??
    DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins;

  const apiSettings = rows[0].settings ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES;
  const corsHeaders = buildCorsHeaders(
    allowedOrigins as string[],
    requestOrigin,
    buildAllowedHeaders(apiSettings),
  );

  // CORS check
  if (allowedOrigins.length > 0 && !(requestOrigin && allowedOrigins.includes(requestOrigin))) {
    return NextResponse.json({ error: 'Origin not allowed.' }, {
      status: HttpStatus.FORBIDDEN,
      headers: corsHeaders,
    });
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

  let config: ReturnType<typeof getVertexSearchConfigOrThrow>;
  try {
    config = getVertexSearchConfigOrThrow(searchApp.provider_config);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, {
      status: HttpStatus.BAD_REQUEST,
      headers: corsHeaders,
    });
  }

  const { gcp_project_id, location, collection_id, engine_id } = config;

  const apiBase =
    location === 'global'
      ? 'https://discoveryengine.googleapis.com'
      : `https://${location}-discoveryengine.googleapis.com`;

  // Discovery Engine completeQuery endpoint.
  // Try v1beta (stable, engine path) then fall back to v1alpha.
  // Autocomplete must be enabled in Cloud Console:
  //   AI Applications → your app → Configurations → Autocomplete → Enable
  const buildUrl = (version: string) => {
    const u = new URL(
      `${apiBase}/${version}/projects/${gcp_project_id}/locations/${location}` +
      `/collections/${collection_id}/engines/${engine_id}:completeQuery`,
    );
    u.searchParams.set('query', trimmedQuery);
    // Don't specify queryModel — let the API use the configured default.
    // Setting it to an unsupported model causes 404.
    u.searchParams.set('includeTailSuggestions', 'true');
    return u;
  };

  let token: string;
  try {
    token = await getDiscoveryEngineAccessToken(
      searchApp.credentials_json
        ? decryptCredentials(searchApp.credentials_json)
        : null,
    );
  } catch (err) {
    logger.error('Autocomplete: failed to get access token', err as Error, { publicSlug });
    return NextResponse.json({ suggestions: [] }, { headers: corsHeaders });
  }

  // Helper: attempt one API version
  async function tryFetch(version: string): Promise<Response> {
    return fetch(buildUrl(version).toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  try {
    // Try v1beta first, fall back to v1alpha on 404/405
    let res = await tryFetch('v1beta');

    if (res.status === 404 || res.status === 405) {
      logger.info('Autocomplete v1beta returned 404, trying v1alpha', { publicSlug });
      res = await tryFetch('v1alpha');
    }

    if (!res.ok) {
      let body = '';
      try { body = await res.text(); } catch { /* ignore */ }
      logger.warn('Autocomplete API error', {
        status: res.status,
        publicSlug,
        engineId: engine_id,
        body: body.slice(0, 300),
        hint: res.status === 404
          ? 'Autocomplete may not be enabled. Go to AI Applications → your app → Configurations → Autocomplete → Enable.'
          : undefined,
      });
      return NextResponse.json({ suggestions: [] }, { headers: corsHeaders });
    }

    const data = (await res.json()) as {
      querySuggestions?: Array<{ suggestion?: string; completable?: boolean }>;
    };

    const suggestions = (data.querySuggestions ?? [])
      .map((s) => s.suggestion ?? '')
      .filter(Boolean)
      .slice(0, 8);

    return NextResponse.json({ suggestions }, { headers: corsHeaders });
  } catch (err) {
    logger.error('Autocomplete fetch error', err as Error, { publicSlug });
    return NextResponse.json({ suggestions: [] }, { headers: corsHeaders });
  }
}
