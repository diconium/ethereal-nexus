/**
 * Shared Google Cloud access-token helper for Discovery Engine requests.
 *
 * Centralises credential resolution, JSON validation, and token acquisition so
 * that google-vertex-search.ts and the suggest route handler stay in
 * sync.  Clients are cached by credential identity so that GoogleAuth's built-in
 * token cache is reused across requests (access tokens are valid for ~1 hour).
 *
 * Credential priority:
 *   1. appCredentialsJson — decrypted service-account JSON from the DB
 *   2. GOOGLE_SEARCH_CREDENTIALS_JSON env var — shared fallback
 *   3. Application Default Credentials (Cloud Run / GKE / gcloud ADC)
 */

import { GoogleAuth } from 'google-auth-library';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DISCOVERY_ENGINE_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
];

// ---------------------------------------------------------------------------
// Client cache — keyed by credential identity so GoogleAuth's internal
// token cache is reused across requests instead of fetching a new token
// on every call.
// ---------------------------------------------------------------------------

const authClientCache = new Map<string, GoogleAuth>();

/**
 * Derives a collision-resistant cache key from the raw credentials string.
 *
 * Using only client_email is insufficient because:
 *   - client_email may be missing or empty (falls back to __unknown__, causing collisions)
 *   - rotated keys share the same email but have a different private_key_id / private_key
 *   - malformed JSON leaves clientEmail as __unknown__ for all invalid inputs
 *
 * Instead we SHA-256 hash the full raw string.  The hash is deterministic so
 * the same credentials always map to the same cached client, but distinct
 * credentials (even with the same email) always get distinct entries.
 * The raw string never appears in logs or memory beyond this function.
 */
function credentialsCacheKey(raw: string): string {
  return 'sa:' + createHash('sha256').update(raw).digest('hex');
}

function getAuthClient(
  credentialsJson: string | null | undefined,
): GoogleAuth {
  const raw =
    credentialsJson?.trim() ||
    process.env.GOOGLE_SEARCH_CREDENTIALS_JSON?.trim() ||
    null;

  if (raw) {
    const cacheKey = credentialsCacheKey(raw);
    const cached = authClientCache.get(cacheKey);
    if (cached) return cached;

    // Validate JSON and build credentials object
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Invalid service account JSON for Discovery Engine: ${(err as Error).message}`,
      );
    }

    const auth = new GoogleAuth({
      credentials: credentials as any,
      scopes: DISCOVERY_ENGINE_SCOPES,
    });
    authClientCache.set(cacheKey, auth);
    return auth;
  }

  // ADC fallback — cached under a fixed key
  const ADC_CACHE_KEY = '__adc__';
  const cached = authClientCache.get(ADC_CACHE_KEY);
  if (cached) return cached;

  const auth = new GoogleAuth({ scopes: DISCOVERY_ENGINE_SCOPES });
  authClientCache.set(ADC_CACHE_KEY, auth);
  return auth;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a short-lived Bearer token for the Discovery Engine API.
 *
 * @param appCredentialsJson - Decrypted service-account JSON string from the
 *   search app's DB record (result of `decryptCredentials()`).  Pass `null`
 *   to fall back to the `GOOGLE_SEARCH_CREDENTIALS_JSON` env var or ADC.
 */
export async function getDiscoveryEngineAccessToken(
  appCredentialsJson: string | null | undefined,
): Promise<string> {
  const auth = getAuthClient(appCredentialsJson);
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  // google-auth-library has returned both a plain string and an object with a
  // .token property across versions/client types.  Normalise both shapes so
  // this code is resilient to version drift.
  const token =
    typeof tokenResponse === 'string'
      ? tokenResponse
      : tokenResponse?.token ?? null;

  if (!token) {
    const hasExplicitCredentials =
      !!(appCredentialsJson?.trim() ||
        process.env.GOOGLE_SEARCH_CREDENTIALS_JSON?.trim());

    throw new Error(
      hasExplicitCredentials
        ? 'Failed to obtain an access token from the configured service account credentials.'
        : 'No credentials configured. Add a service account JSON key in the Security tab ' +
          'of this search app, or set GOOGLE_SEARCH_CREDENTIALS_JSON as a fallback env var.',
    );
  }

  return token;
}
