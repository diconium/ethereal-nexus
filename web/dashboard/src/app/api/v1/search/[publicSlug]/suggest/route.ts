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

function buildCorsHeaders(
  allowedOrigins: string[],
  requestOrigin: string | null,
): Record<string, string> {
  if (!allowedOrigins.length) return { 'Access-Control-Allow-Origin': '*' };
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return { 'Access-Control-Allow-Origin': requestOrigin, Vary: 'Origin' };
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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

  const corsHeaders = buildCorsHeaders(allowedOrigins as string[], requestOrigin);

  // CORS check
  if (allowedOrigins.length > 0 && !(requestOrigin && allowedOrigins.includes(requestOrigin))) {
    return NextResponse.json({ error: 'Origin not allowed.' }, {
      status: HttpStatus.FORBIDDEN,
      headers: corsHeaders,
    });
  }

  // Empty / whitespace query — return early with CORS headers so browsers
  // can read the response cross-origin (moving this after corsHeaders is built).
  // Empty, whitespace-only, or single-character queries return immediately
  // without calling Discovery Engine — the API requires at least 2 characters
  // to generate meaningful suggestions, and the e2e tests assert this behaviour.
  if (!query.trim() || query.trim().length < 2) {
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
    u.searchParams.set('query', query);
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
