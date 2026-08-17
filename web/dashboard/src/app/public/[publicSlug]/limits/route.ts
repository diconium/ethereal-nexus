import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import {
  projectAiSearchApps,
  projectAiSearchAppApiSettings,
} from '@/data/ai/schema';
import {
  buildIdentityResolution,
  getCounterState,
  getSessionCookieIdentifier,
  getTemporaryBlock,
  hasTrustedClientIp,
} from '@/lib/rate-limit';
import { HttpStatus } from '@/app/api/utils';
import {
  buildSearchAllowedHeaders,
  buildSearchCorsHeaders,
  DEFAULT_SEARCH_CORS_HEADERS,
  isSearchOriginAllowed,
} from '@/lib/public-search-cors';

type RouteContext = {
  params: Promise<{
    publicSlug: string;
  }>;
};

// ---------------------------------------------------------------------------
// OPTIONS — preflight
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
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ---------------------------------------------------------------------------
// GET — rate limit state
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;

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

  const row = rows[0];
  if (!row?.searchApp) {
    return NextResponse.json(
      { error: 'Search app not found.' },
      { status: HttpStatus.NOT_FOUND, headers: DEFAULT_SEARCH_CORS_HEADERS },
    );
  }

  const searchApp = row.searchApp;
  const allowedOrigins =
    (row.settings?.allowed_origins as string[]) ??
    (DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins as string[]);

  const corsHeaders = buildSearchCorsHeaders(
    allowedOrigins,
    request,
    buildSearchAllowedHeaders(
      row.settings ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES,
    ),
    'GET, OPTIONS',
  );

  // Enforce allowed origins — same policy as the main search route
  if (!isSearchOriginAllowed(allowedOrigins, request)) {
    return NextResponse.json(
      { error: 'Origin not allowed.' },
      { status: HttpStatus.FORBIDDEN, headers: corsHeaders },
    );
  }

  if (
    (row.settings ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES)
      .rate_limit_use_ip &&
    !hasTrustedClientIp(request)
  ) {
    return NextResponse.json(
      { error: 'Search is temporarily unavailable. Please try again later.' },
      { status: 503, headers: corsHeaders },
    );
  }

  const settings = row.settings ?? {
    id: crypto.randomUUID(),
    project_id: searchApp.project_id,
    environment_id: searchApp.environment_id,
    search_app_id: searchApp.id,
    ...DEFAULT_SEARCH_APP_API_SETTINGS_VALUES,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const identityResolution = buildIdentityResolution(request, {
    useIp: settings.rate_limit_use_ip,
    useSessionCookie: settings.rate_limit_use_session_cookie,
    useFingerprint: settings.rate_limit_use_fingerprint,
    fingerprintHeaderName: settings.fingerprint_header_name,
  });
  const sessionIdentityKey = getSessionCookieIdentifier(request);
  const sessionCapIdentityKey = sessionIdentityKey
    ? `session:${sessionIdentityKey}`
    : identityResolution.identities[0]?.key || null;
  const scopeKey = `search:${publicSlug}`;
  const temporaryBlockIdentities = [
    ...identityResolution.identities,
    ...(sessionCapIdentityKey &&
    !identityResolution.identities.some(
      (identity) => identity.key === sessionCapIdentityKey,
    )
      ? [{ source: 'session' as const, key: sessionCapIdentityKey }]
      : []),
  ];

  const requestWindow = settings.rate_limit_enabled
    ? await Promise.all(
        identityResolution.identities.map(async (identity) => {
          const state = await getCounterState(
            `${scopeKey}:${identity.key}:window`,
          );
          return {
            source: identity.source,
            current: state.current,
            remaining: Math.max(
              0,
              settings.rate_limit_max_requests - state.current,
            ),
            resetSeconds: state.resetSeconds,
            limit: settings.rate_limit_max_requests,
            windowSeconds: settings.rate_limit_window_seconds,
          };
        }),
      )
    : [];

  const temporaryBlock = settings.temporary_block_enabled
    ? await Promise.all(
        temporaryBlockIdentities.map(async (identity) => {
          const state = await getTemporaryBlock(`${scopeKey}:${identity.key}`);
          return { source: identity.source, ...state };
        }),
      )
    : [];

  const sessionCap =
    settings.session_request_cap_enabled && sessionCapIdentityKey
      ? await getCounterState(
          `${scopeKey}:${sessionCapIdentityKey}:session-cap`,
        )
      : null;

  return NextResponse.json(
    {
      requestWindow: {
        enabled: settings.rate_limit_enabled,
        identities: requestWindow,
      },
      sessionCap: {
        enabled: settings.session_request_cap_enabled,
        available: Boolean(sessionCapIdentityKey),
        current: sessionCap?.current ?? 0,
        remaining: sessionCap
          ? Math.max(
              0,
              settings.session_request_cap_max_requests - sessionCap.current,
            )
          : settings.session_request_cap_max_requests,
        resetSeconds: sessionCap?.resetSeconds ?? 0,
        limit: settings.session_request_cap_max_requests,
        windowSeconds: settings.session_request_cap_window_seconds,
      },
      temporaryBlock: {
        enabled: settings.temporary_block_enabled,
        identities: temporaryBlock,
      },
      allowedOrigins: {
        configured: allowedOrigins.length > 0,
        count: allowedOrigins.length,
      },
    },
    { headers: corsHeaders },
  );
}
