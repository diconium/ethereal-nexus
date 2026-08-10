/**
 * Minimal Contentful client used by the connector.
 *
 * Two distinct APIs with different credentials:
 *  - Content Delivery API (CDA) — read-only, `cdn.contentful.com` (or
 *    `preview.contentful.com`), authenticated with the DELIVERY token. Used for
 *    Validation + Discovery.
 *  - Content Management API (CMA) — read/write, `api.contentful.com`,
 *    authenticated with the MANAGEMENT token. Used for Provisioning.
 *
 * Server-only. Do not import from client components (it uses decrypted tokens).
 * Bearer auth, request timeouts, and descriptive error mapping
 * (401/403/404/429/network/timeout).
 */

import type { ContentfulConfig } from '../../config';

const DEFAULT_API_HOST = 'https://api.contentful.com';
const DEFAULT_DELIVERY_HOST = 'https://cdn.contentful.com';
const DEFAULT_PREVIEW_HOST = 'https://preview.contentful.com';
const CMA_CONTENT_TYPE = 'application/vnd.contentful.management.v1+json';

/** Which Contentful API a request targets. */
export type ContentfulApi = 'delivery' | 'management';

/** Low-level request result — never throws. */
export type ContentfulRequestResult = {
  ok: boolean;
  status: number;
  /** True when the request failed before receiving a response (network/timeout). */
  networkError: boolean;
  errorMessage?: string;
  /** Parsed JSON body, when the response had one. */
  body?: unknown;
  /** Raw text body (fallback when JSON parse fails). */
  text?: string;
  /** `X-Contentful-Version` response header (needed for updates/publish). */
  version?: number;
  /** `Retry-After` seconds on 429. */
  retryAfter?: number;
};

/** A typed error thrown by the higher-level helpers. */
export class ContentfulError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ContentfulError';
    this.status = status;
    this.code = code;
  }
}

/** Map an HTTP status / network failure to a descriptive ContentfulError. */
export function toContentfulError(
  res: ContentfulRequestResult,
  context: string,
): ContentfulError {
  if (res.networkError) {
    const timedOut = res.errorMessage === 'Request timed out';
    return new ContentfulError(
      timedOut
        ? `${context}: request timed out.`
        : `${context}: network error — ${res.errorMessage ?? 'unreachable'}.`,
      0,
      timedOut ? 'timeout' : 'network',
    );
  }
  switch (res.status) {
    case 401:
      return new ContentfulError(
        `${context}: unauthorized — the access token is invalid or expired. ` +
          `Discovery needs a Content Delivery API token; provisioning needs a ` +
          `Content Management API token (Personal Access Token).`,
        401,
        'unauthorized',
      );
    case 403:
      return new ContentfulError(
        `${context}: forbidden — the token lacks permission for this space/environment. ` +
          `Check you used the right token type (Delivery vs Management).`,
        403,
        'forbidden',
      );
    case 404:
      return new ContentfulError(
        `${context}: not found — check the Space ID and Environment.`,
        404,
        'not_found',
      );
    case 422:
      {
        const base = extractMessage(res.body) ?? 'unprocessable entity';
        const details = extractValidationDetails(res.body);
        const hint = details.length > 0 ? ` (${details.join(' | ')})` : '';
        const requestId = extractRequestId(res.body);
        const req = requestId ? ` [requestId: ${requestId}]` : '';
        return new ContentfulError(
          `${context}: validation failed — ${base}${hint}${req}.`,
          422,
          'unprocessable',
        );
      }
    case 429:
      return new ContentfulError(
        `${context}: rate limited by Contentful${
          res.retryAfter ? ` — retry after ${res.retryAfter}s` : ''
        }.`,
        429,
        'rate_limited',
      );
    default:
      return new ContentfulError(
        `${context}: unexpected response (HTTP ${res.status})${
          extractMessage(res.body) ? ` — ${extractMessage(res.body)}` : ''
        }.`,
        res.status,
        'http_error',
      );
  }
}

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.message === 'string') return b.message;
    if (b.sys && typeof b.sys === 'object') {
      const sys = b.sys as Record<string, unknown>;
      if (typeof sys.id === 'string') return sys.id;
    }
  }
  return undefined;
}

function extractRequestId(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  return typeof b.requestId === 'string' ? b.requestId : undefined;
}

/**
 * Best-effort flattening of Contentful validation errors into compact hints.
 * Example output: `fields.slug.validations.0: regexp invalid`.
 */
function extractValidationDetails(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  const details = b.details;
  if (!details || typeof details !== 'object') return [];
  const errors = (details as Record<string, unknown>).errors;
  if (!Array.isArray(errors)) return [];

  const out: string[] = [];
  for (const raw of errors) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    const pathArr = Array.isArray(e.path)
      ? e.path.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number')
      : [];
    const path = pathArr.length > 0 ? pathArr.join('.') : undefined;

    const name = typeof e.name === 'string' ? e.name : undefined;
    const message =
      typeof e.message === 'string'
        ? e.message
        : e.details && typeof e.details === 'object'
          ? typeof (e.details as Record<string, unknown>).message === 'string'
            ? ((e.details as Record<string, unknown>).message as string)
            : undefined
          : undefined;

    const summary = message ?? name ?? 'validation issue';
    out.push(path ? `${path}: ${summary}` : summary);
    if (out.length >= 3) break;
  }
  return out;
}

/** Resolve the host + token for the chosen API. */
function resolveApi(
  config: ContentfulConfig,
  api: ContentfulApi,
): { host: string; token: string } {
  if (api === 'management') {
    return {
      host: (config.apiHost ?? DEFAULT_API_HOST).replace(/\/+$/, ''),
      token: config.managementToken ?? '',
    };
  }
  // delivery (or preview)
  const host = config.usePreview
    ? DEFAULT_PREVIEW_HOST
    : (config.deliveryHost ?? DEFAULT_DELIVERY_HOST);
  return { host: host.replace(/\/+$/, ''), token: config.deliveryToken };
}

/** Build the base path for the configured space + environment. */
export function envBase(config: ContentfulConfig): string {
  const env = config.environment ?? 'master';
  return `/spaces/${config.spaceId}/environments/${env}`;
}

/**
 * Perform a request against a Contentful API (delivery by default).
 * Never throws — network/timeout failures are returned as `networkError`.
 */
export async function contentfulRequest(
  config: ContentfulConfig,
  path: string,
  options: {
    /** Which API to hit (default 'delivery'). */
    api?: ContentfulApi;
    method?: string;
    body?: unknown;
    /** Send Management content-type + version header for writes. */
    version?: number;
    /** Override the default JSON Accept. */
    accept?: string;
  } = {},
): Promise<ContentfulRequestResult> {
  const { api = 'delivery', method = 'GET', body, version } = options;
  const { host, token } = resolveApi(config, api);
  const url = `${host}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 30000,
  );

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: options.accept ?? 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = CMA_CONTENT_TYPE;
  }
  if (typeof version === 'number') {
    headers['X-Contentful-Version'] = String(version);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let parsed: unknown;
    let text: string | undefined;
    try {
      text = await response.text();
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    const versionHeader = response.headers.get('x-contentful-version');
    const retryAfter = response.headers.get('retry-after');

    return {
      ok: response.ok,
      status: response.status,
      networkError: false,
      body: parsed,
      text,
      version: versionHeader ? Number(versionHeader) : undefined,
      retryAfter: retryAfter ? Number(retryAfter) : undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === 'AbortError'
          ? 'Request timed out'
          : error.message
        : 'Request failed';
    return { ok: false, status: 0, networkError: true, errorMessage: message };
  } finally {
    clearTimeout(timeout);
  }
}

/* ----------------------------- CMA shapes ----------------------------- */

export interface ContentfulSpace {
  sys: { id: string; type: 'Space' };
  name: string;
}

export interface ContentfulEnvironment {
  sys: { id: string; type: 'Environment' };
  name?: string;
}

export interface ContentfulLocale {
  code: string;
  name: string;
  default: boolean;
  fallbackCode?: string | null;
}

export interface ContentfulFieldValidation {
  linkContentType?: string[];
  in?: (string | number)[];
  size?: { min?: number; max?: number };
  range?: { min?: number; max?: number };
  regexp?: { pattern: string };
  unique?: boolean;
  [key: string]: unknown;
}

export interface ContentfulField {
  id: string;
  name: string;
  type: string; // Symbol | Text | Integer | Number | Date | Boolean | Location | Object | RichText | Array | Link
  required?: boolean;
  localized?: boolean;
  disabled?: boolean;
  omitted?: boolean;
  linkType?: 'Entry' | 'Asset';
  validations?: ContentfulFieldValidation[];
  items?: {
    type: string;
    linkType?: 'Entry' | 'Asset';
    validations?: ContentfulFieldValidation[];
  };
}

export interface ContentfulContentType {
  sys: { id: string; type: 'ContentType'; version?: number };
  name: string;
  description?: string;
  displayField?: string;
  fields: ContentfulField[];
}

export interface ContentfulAssetMeta {
  sys: { id: string; type: 'Asset' };
  fields?: {
    title?: Record<string, string>;
    file?: Record<string, { contentType?: string; fileName?: string }>;
  };
}

interface CollectionResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

/* ------------------- Delivery API helpers (discovery) ------------------ */
/* Each throws a ContentfulError on failure (network/HTTP/permission).      */
/* These use the DELIVERY token against cdn/preview.contentful.com.         */

export async function getSpace(config: ContentfulConfig): Promise<ContentfulSpace> {
  const res = await contentfulRequest(config, `/spaces/${config.spaceId}`, {
    api: 'delivery',
  });
  if (!res.ok) throw toContentfulError(res, 'Retrieve space');
  return res.body as ContentfulSpace;
}

/**
 * Verify the configured environment is reachable with the delivery token.
 * The CDA has no `/environments` collection, so we probe an env-scoped
 * endpoint: a 404 means the environment does not exist.
 */
export async function environmentExists(
  config: ContentfulConfig,
): Promise<boolean> {
  const res = await contentfulRequest(
    config,
    `${envBase(config)}/content_types?limit=0`,
    { api: 'delivery' },
  );
  if (res.status === 404) return false;
  if (!res.ok) throw toContentfulError(res, 'Verify environment');
  return true;
}

export async function listLocales(
  config: ContentfulConfig,
): Promise<ContentfulLocale[]> {
  const res = await contentfulRequest(config, `${envBase(config)}/locales`, {
    api: 'delivery',
  });
  if (!res.ok) throw toContentfulError(res, 'Retrieve locales');
  return (res.body as CollectionResponse<ContentfulLocale>).items ?? [];
}

export async function listContentTypes(
  config: ContentfulConfig,
  options: { limit?: number; api?: ContentfulApi } = {},
): Promise<ContentfulContentType[]> {
  const { limit = 1000, api = 'delivery' } = options;
  const res = await contentfulRequest(
    config,
    `${envBase(config)}/content_types?limit=${limit}`,
    { api },
  );
  if (!res.ok) throw toContentfulError(res, 'Retrieve content types');
  return (res.body as CollectionResponse<ContentfulContentType>).items ?? [];
}

export async function listAssets(
  config: ContentfulConfig,
  limit = 100,
): Promise<{ items: ContentfulAssetMeta[]; total: number }> {
  const res = await contentfulRequest(
    config,
    `${envBase(config)}/assets?limit=${limit}`,
    { api: 'delivery' },
  );
  if (!res.ok) throw toContentfulError(res, 'Retrieve assets');
  const body = res.body as CollectionResponse<ContentfulAssetMeta>;
  return { items: body.items ?? [], total: body.total ?? 0 };
}

/* ------------------ Management API helpers (provision) ----------------- */
/* These use the MANAGEMENT token against api.contentful.com.               */

export async function listEnvironmentsCma(
  config: ContentfulConfig,
): Promise<ContentfulEnvironment[]> {
  const res = await contentfulRequest(
    config,
    `/spaces/${config.spaceId}/environments`,
    { api: 'management' },
  );
  if (!res.ok) throw toContentfulError(res, 'Retrieve environments');
  return (res.body as CollectionResponse<ContentfulEnvironment>).items ?? [];
}

/** Create or update a content type (PUT is idempotent by id). CMA only. */
export async function putContentType(
  config: ContentfulConfig,
  contentTypeId: string,
  payload: {
    name: string;
    description?: string;
    displayField?: string;
    fields: ContentfulField[];
  },
  version?: number,
): Promise<ContentfulContentType> {
  const res = await contentfulRequest(
    config,
    `${envBase(config)}/content_types/${contentTypeId}`,
    { api: 'management', method: 'PUT', body: payload, version },
  );
  if (!res.ok) throw toContentfulError(res, `Create content type "${contentTypeId}"`);
  return res.body as ContentfulContentType;
}

/** Publish a content type at a specific version. CMA only. */
export async function publishContentType(
  config: ContentfulConfig,
  contentTypeId: string,
  version: number,
): Promise<ContentfulContentType> {
  const res = await contentfulRequest(
    config,
    `${envBase(config)}/content_types/${contentTypeId}/published`,
    { api: 'management', method: 'PUT', version },
  );
  if (!res.ok) throw toContentfulError(res, `Publish content type "${contentTypeId}"`);
  return res.body as ContentfulContentType;
}
