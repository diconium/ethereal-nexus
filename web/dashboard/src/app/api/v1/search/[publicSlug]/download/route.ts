import { NextRequest, NextResponse } from 'next/server';
import { Storage, type StorageOptions } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { db } from '@/db';
import {
  projectAiSearchApps,
  projectAiSearchAppApiSettings,
} from '@/data/ai/schema';
import { eq, and } from 'drizzle-orm';
import { HttpStatus } from '@/app/api/utils';
import { logger } from '@/lib/logger';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import { getVertexSearchConfigOrThrow } from '@/data/ai/provider';
import {
  buildIdentityResolution,
  checkRateLimit,
  getClientIp,
  getTemporaryBlock,
  registerViolationAndMaybeBlock,
} from '@/lib/rate-limit';
import { decryptCredentials } from '@/lib/credentials-encryption';

type RouteContext = {
  params: Promise<{ publicSlug: string }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How long (seconds) the signed URL is valid. */
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

const DEFAULT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildCorsHeaders(
  allowedOrigins: string[],
  requestOrigin: string | null,
): Record<string, string> {
  if (!allowedOrigins.length) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
  }
  return { Vary: 'Origin' };
}

function isCorsAllowed(allowedOrigins: string[], requestOrigin: string | null): boolean {
  if (!allowedOrigins.length) return true;
  if (!requestOrigin) return false;
  return allowedOrigins.includes(requestOrigin);
}

// ---------------------------------------------------------------------------
// GCS URI allowlist validation
//
// Each entry in allowed_gcs_buckets can be:
//   - A bucket name:          "my-bucket"           matches gs://my-bucket/anything
//   - A gs:// bucket prefix:  "gs://my-bucket/docs"  matches gs://my-bucket/docs/...
//   - A full gs:// path:      "gs://my-bucket/file.pdf" exact match only
// ---------------------------------------------------------------------------

function isGcsUriAllowed(gcsUri: string, allowedBuckets: string[]): boolean {
  if (allowedBuckets.length === 0) return false; // deny-by-default

  for (const entry of allowedBuckets) {
    const normalized = entry.trim();
    if (!normalized) continue;

    if (normalized.startsWith('gs://')) {
      // prefix or exact match
      if (gcsUri === normalized || gcsUri.startsWith(normalized.endsWith('/') ? normalized : normalized + '/')) {
        return true;
      }
    } else {
      // bare bucket name — match any path within it
      const bucketPrefix = `gs://${normalized}/`;
      if (gcsUri.startsWith(bucketPrefix) || gcsUri === `gs://${normalized}`) {
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Storage client cache — keyed by service account email
// ---------------------------------------------------------------------------

const storageCache = new Map<string, Storage>();

function getStorageClient(credentialsJson: string | null | undefined): Storage {
  const raw =
    credentialsJson?.trim() ||
    process.env.GOOGLE_SEARCH_CREDENTIALS_JSON?.trim() ||
    null;

  if (raw) {
    // Use a SHA-256 hash of the full raw credentials string as the cache key.
    // Keying on client_email alone can collide when the email is missing,
    // when keys are rotated (same email, new private_key_id), or when the
    // JSON is malformed (multiple bad inputs would share __default__).
    const cacheKey = 'sa:' + createHash('sha256').update(raw).digest('hex');
    const cached = storageCache.get(cacheKey);
    if (cached) return cached;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid service account JSON stored for this search app.');
    }

    // Type the credentials to Storage's expected shape rather than `any`
    const credentials: StorageOptions['credentials'] = {
      client_email: parsed.client_email as string | undefined,
      private_key: parsed.private_key as string | undefined,
    };

    const client = new Storage({ credentials });
    storageCache.set(cacheKey, client);
    return client;
  }

  // ADC fallback (Cloud Run / GKE) — not cached since it uses ambient credentials
  return new Storage();
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
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ---------------------------------------------------------------------------
// GET — generate signed download URL
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;
  const gcsUri = request.nextUrl.searchParams.get('uri');
  const requestOrigin = request.headers.get('origin');
  const clientIp = getClientIp(request);

  // ------------------------------------------------------------------
  // 1. Basic URI validation
  // ------------------------------------------------------------------
  if (!gcsUri?.startsWith('gs://')) {
    return NextResponse.json(
      { error: 'Missing or invalid uri parameter. Expected gs://bucket/path.' },
      { status: HttpStatus.BAD_REQUEST, headers: DEFAULT_CORS_HEADERS },
    );
  }

  // ------------------------------------------------------------------
  // 2. Look up app + settings
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
      { status: HttpStatus.NOT_FOUND, headers: DEFAULT_CORS_HEADERS },
    );
  }

  const searchApp = rows[0].searchApp;
  const apiSettings =
    rows[0].settings ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES;
  const allowedOrigins = (apiSettings.allowed_origins as string[]) ?? [];
  const corsHeaders = buildCorsHeaders(allowedOrigins, requestOrigin);

  // ------------------------------------------------------------------
  // 3. CORS / allowed origins
  // ------------------------------------------------------------------
  if (!isCorsAllowed(allowedOrigins, requestOrigin)) {
    return NextResponse.json(
      { error: 'Origin not allowed.' },
      { status: HttpStatus.FORBIDDEN, headers: corsHeaders },
    );
  }

  // ------------------------------------------------------------------
  // 4. Rate limiting — reuse the same pipeline as the search route
  // ------------------------------------------------------------------
  const scopeKey = `search:${publicSlug}`;
  const identityResolution = buildIdentityResolution(request, {
    useIp: apiSettings.rate_limit_use_ip,
    useSessionCookie: apiSettings.rate_limit_use_session_cookie,
    useFingerprint: apiSettings.rate_limit_use_fingerprint,
    fingerprintHeaderName: apiSettings.fingerprint_header_name,
  });

  if (apiSettings.temporary_block_enabled) {
    for (const identity of identityResolution.identities) {
      const block = await getTemporaryBlock(`${scopeKey}:${identity.key}`);
      if (block.blocked) {
        return NextResponse.json(
          { error: 'Too many requests. Temporary block active.' },
          {
            status: 429,
            headers: { ...corsHeaders, 'Retry-After': String(block.resetSeconds) },
          },
        );
      }
    }
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

  // ------------------------------------------------------------------
  // 5. GCS bucket allowlist — secure by default (empty list = deny all)
  // ------------------------------------------------------------------
  let config: ReturnType<typeof getVertexSearchConfigOrThrow>;
  try {
    config = getVertexSearchConfigOrThrow(searchApp.provider_config);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders },
    );
  }

  const { allowed_gcs_buckets } = config;

  if (!isGcsUriAllowed(gcsUri, allowed_gcs_buckets)) {
    logger.warn('Download blocked: bucket not in allowlist', {
      route: 'search-download',
      publicSlug,
      gcsUri,
      allowedBuckets: allowed_gcs_buckets,
      clientIp,
    });

    const hint =
      allowed_gcs_buckets.length === 0
        ? 'No GCS buckets are configured for downloads on this search app. Add bucket names in the Search App → Google Cloud → Allowed GCS Buckets.'
        : 'The requested GCS bucket is not in the allowed list for this search app.';

    return NextResponse.json(
      { error: 'Download not permitted.', hint },
      { status: HttpStatus.FORBIDDEN, headers: corsHeaders },
    );
  }

  // ------------------------------------------------------------------
  // 6. Parse bucket + object path
  // ------------------------------------------------------------------
  const withoutScheme = gcsUri.slice('gs://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex === -1) {
    return NextResponse.json(
      { error: 'Invalid GCS URI format.' },
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders },
    );
  }

  const bucketName = withoutScheme.slice(0, slashIndex);
  const objectPath = withoutScheme.slice(slashIndex + 1);

  logger.info('Generating GCS signed URL', {
    route: 'search-download',
    publicSlug,
    bucket: bucketName,
    object: objectPath,
    clientIp,
  });

  // ------------------------------------------------------------------
  // 7. Generate signed URL or fall back to public URL
  // ------------------------------------------------------------------
  try {
    const storage = getStorageClient(
      searchApp.credentials_json
        ? decryptCredentials(searchApp.credentials_json)
        : null,
    );
    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      });

    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    logger.error('Failed to generate GCS signed URL', error as Error, {
      route: 'search-download',
      bucket: bucketName,
      object: objectPath,
    });

    // Fall back to public HTTPS URL (works only for public buckets)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
    logger.info('Falling back to public GCS URL', { publicUrl });
    return NextResponse.redirect(publicUrl, 302);
  }
}
