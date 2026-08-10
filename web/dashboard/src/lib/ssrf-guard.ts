/**
 * SSRF (Server-Side Request Forgery) protection guard.
 *
 * Call `validateEndpointUrl(url)` before making any outbound HTTP request with
 * a user-supplied URL. Throws a descriptive error if the URL resolves to a
 * disallowed host — preventing attackers from using Nexus as a proxy to reach
 * internal services, cloud metadata endpoints, or localhost.
 *
 * **Development mode**: When `NODE_ENV !== 'production'`, loopback addresses
 * and private IP ranges are allowed so developers can point connectors at local
 * CMS instances (e.g. AEM at localhost:4502). Cloud metadata endpoints
 * (169.254.x.x) are ALWAYS blocked regardless of environment.
 *
 * Server-only. Never import from client components.
 */

/** Patterns always blocked regardless of environment (cloud metadata, unspecified). */
const ALWAYS_BLOCKED_PATTERNS: RegExp[] = [
  // Link-local / cloud metadata (169.254.0.0/16) — AWS/GCP/Azure IMDS
  /^169\.254\.\d+\.\d+$/,
  // Unspecified / broadcast
  /^0\.0\.0\.0$/,
  /^255\.255\.255\.255$/,
];

/** Patterns blocked in production only (loopback + private ranges). */
const PRODUCTION_BLOCKED_PATTERNS: RegExp[] = [
  // Loopback
  /^127\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^\[::1\]$/,
  /^localhost$/i,
  // Private IPv4 — Class A
  /^10\.\d+\.\d+\.\d+$/,
  // Private IPv4 — Class B (172.16.0.0/12 → 172.16.x.x – 172.31.x.x)
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  // Private IPv4 — Class C
  /^192\.168\.\d+\.\d+$/,
  // IPv6 private / link-local
  /^fe80:/i,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
];

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * Validate that the given URL is safe to use as an outbound connector endpoint.
 *
 * Throws a `SsrfBlockedError` if:
 * - The URL uses a non-HTTP/HTTPS scheme
 * - The hostname is a cloud metadata endpoint (always blocked)
 * - In production (`NODE_ENV === 'production'`): the hostname is a loopback
 *   address or private IP range
 *
 * In development/test, loopback and private IPs are allowed so developers can
 * point connectors at local CMS instances (e.g. AEM at localhost:4502).
 *
 * @param url - The user-supplied endpoint URL string.
 * @throws {SsrfBlockedError} when the URL targets a disallowed host.
 */
export function validateEndpointUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfBlockedError(
      `Invalid URL: "${url}". Please provide a valid HTTP or HTTPS endpoint.`,
    );
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new SsrfBlockedError(
      `Disallowed URL scheme "${parsed.protocol}". Only http:// and https:// are permitted.`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  // Cloud metadata endpoints are always blocked in every environment.
  for (const pattern of ALWAYS_BLOCKED_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SsrfBlockedError(
        `Endpoint URL "${parsed.origin}" targets a disallowed host. ` +
          `Cloud metadata endpoints are not permitted.`,
      );
    }
  }

  // Loopback and private IP ranges are only blocked in production.
  // In development, local CMS instances (e.g. localhost:4502) are allowed.
  if (isProduction) {
    for (const pattern of PRODUCTION_BLOCKED_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new SsrfBlockedError(
          `Endpoint URL "${parsed.origin}" targets a disallowed host. ` +
            `Private IP ranges and loopback addresses are not permitted in production.`,
        );
      }
    }
  }
}

/** Error thrown when a URL is rejected by the SSRF guard. */
export class SsrfBlockedError extends Error {
  readonly code = 'SSRF_BLOCKED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}
