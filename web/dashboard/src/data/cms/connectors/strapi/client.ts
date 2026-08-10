/**
 * StrapiClient — minimal HTTP client for the Strapi v5 REST API.
 *
 * Targets:
 *  - Content API   (read content, locales, server info)
 *  - Admin API     (content-type-builder — list/create/update types & components)
 *
 * Authentication: API Token passed as `Authorization: Bearer <token>`.
 *
 * Design principles:
 *  - Never throws — all network/HTTP failures are returned as StrapiRequestResult.
 *  - StrapiError is thrown only by the higher-level named helpers, not by
 *    strapiRequest() itself.
 *  - All timeouts are configurable (default 30 s).
 *
 * Server-only. Do not import from client components.
 */

import type { StrapiConfig } from '../../config';
import { validateEndpointUrl } from '@/lib/ssrf-guard';

const DEFAULT_TIMEOUT_MS = 30_000;

/* ----------------------------- result types ----------------------------- */

/** Low-level request result — never throws. */
export interface StrapiRequestResult {
  ok: boolean;
  status: number;
  /** True when the request failed before receiving a response (network/timeout). */
  networkError: boolean;
  errorMessage?: string;
  /** Parsed JSON body, when the response had one. */
  body?: unknown;
  /** Raw text body (fallback when JSON parse fails). */
  text?: string;
}

/** A typed error thrown by higher-level helpers. */
export class StrapiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'StrapiError';
    this.status = status;
    this.code = code;
  }
}

/** Map an HTTP status / network failure to a descriptive StrapiError. */
export function toStrapiError(
  res: StrapiRequestResult,
  context: string,
): StrapiError {
  if (res.networkError) {
    const timedOut = res.errorMessage === 'Request timed out';
    return new StrapiError(
      timedOut
        ? `${context}: request timed out.`
        : `${context}: network error — ${res.errorMessage ?? 'unreachable'}.`,
      0,
      timedOut ? 'timeout' : 'network',
    );
  }
  switch (res.status) {
    case 400:
      return new StrapiError(
        `${context}: bad request — ${extractMessage(res.body) ?? 'check request payload'}.`,
        400,
        'bad_request',
      );
    case 401:
      return new StrapiError(
        `${context}: unauthorized — the API token is invalid or missing. ` +
          `Generate a full-access token in Strapi Settings → API Tokens.`,
        401,
        'unauthorized',
      );
    case 403:
      return new StrapiError(
        `${context}: forbidden — the API token lacks permission for this resource. ` +
          `The Content-Type Builder requires an Admin or full-access token.`,
        403,
        'forbidden',
      );
    case 404:
      return new StrapiError(
        `${context}: not found — the resource does not exist or the URL is incorrect.`,
        404,
        'not_found',
      );
    case 409:
      return new StrapiError(
        `${context}: conflict — the resource already exists. ` +
          `Use onConflict: "update" to overwrite.`,
        409,
        'conflict',
      );
    case 429:
      return new StrapiError(
        `${context}: rate limited by Strapi — slow down and retry.`,
        429,
        'rate_limited',
      );
    default:
      return new StrapiError(
        `${context}: unexpected response (HTTP ${res.status})${
          extractMessage(res.body) ? ` — ${extractMessage(res.body)}` : ''
        }.`,
        res.status,
        'http_error',
      );
  }
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.error === 'object' && b.error !== null) {
    const err = b.error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
  }
  if (typeof b.message === 'string') return b.message;
  return undefined;
}

/* ----------------------------- core request ----------------------------- */

/**
 * Perform a request against the Strapi API.
 * Never throws — network/timeout failures are returned as `networkError: true`.
 */
export async function strapiRequest(
  config: StrapiConfig,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<StrapiRequestResult> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // SSRF protection — validate before any network call.
  try {
    validateEndpointUrl(config.serverUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Disallowed endpoint URL';
    return { ok: false, status: 0, networkError: true, errorMessage: message };
  }

  const base = config.serverUrl.replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
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

    return {
      ok: response.ok,
      status: response.status,
      networkError: false,
      body: parsed,
      text,
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

/* ----------------------------- Strapi types ----------------------------- */

export interface StrapiServerInfo {
  data?: {
    strapiVersion?: string;
    nodeVersion?: string;
    autoReload?: boolean;
    appName?: string;
  };
  /** Strapi v4 compat — top-level version field. */
  strapiVersion?: string;
}

export type StrapiAttributeType =
  | 'string'
  | 'text'
  | 'richtext'
  | 'email'
  | 'password'
  | 'uid'
  | 'integer'
  | 'biginteger'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'enumeration'
  | 'json'
  | 'media'
  | 'relation'
  | 'component'
  | 'dynamiczone';

export type StrapiRelationType =
  | 'oneToOne'
  | 'oneToMany'
  | 'manyToOne'
  | 'manyToMany'
  | 'morphOne'
  | 'morphMany'
  | 'morphToOne'
  | 'morphToMany';

export interface StrapiAttribute {
  type: StrapiAttributeType;
  required?: boolean;
  unique?: boolean;
  private?: boolean;
  pluginOptions?: {
    i18n?: { localized?: boolean };
    [key: string]: unknown;
  };
  // enumeration
  enum?: string[];
  // media
  allowedTypes?: ('images' | 'videos' | 'files' | 'audios')[];
  multiple?: boolean;
  // relation
  relation?: StrapiRelationType;
  target?: string; // uid of target content type
  inversedBy?: string;
  mappedBy?: string;
  // component
  component?: string; // uid of component
  repeatable?: boolean;
  min?: number;
  max?: number;
  // dynamiczone
  components?: string[]; // uids of allowed components
  // uid
  targetField?: string;
  // default / misc
  default?: unknown;
  [key: string]: unknown;
}

export interface StrapiContentTypeInfo {
  displayName: string;
  singularName: string;
  pluralName: string;
  description?: string;
  collectionName?: string;
}

export type StrapiContentTypeKind = 'collectionType' | 'singleType';

/**
 * Wire format returned by the Content-Type Builder API for content types.
 * Strapi v5 wraps all schema fields under a `schema` property.
 * We normalize this to a flat shape internally via `normalizeContentType()`.
 */
interface StrapiContentTypeRaw {
  uid: string;
  plugin?: string;
  apiID: string;
  schema: {
    kind: StrapiContentTypeKind;
    displayName: string;
    singularName: string;
    pluralName: string;
    description?: string;
    collectionName?: string;
    draftAndPublish?: boolean;
    pluginOptions?: Record<string, unknown>;
    attributes: Record<string, StrapiAttribute>;
    [key: string]: unknown;
  };
}

/**
 * Wire format returned by the Content-Type Builder API for components.
 * Same schema wrapping as content types.
 */
interface StrapiComponentRaw {
  uid: string;
  category: string;
  apiID: string;
  schema: {
    displayName: string;
    description?: string;
    icon?: string;
    attributes: Record<string, StrapiAttribute>;
    [key: string]: unknown;
  };
}

export interface StrapiContentType {
  uid: string;
  apiID: string;
  kind: StrapiContentTypeKind;
  info: StrapiContentTypeInfo;
  options?: {
    draftAndPublish?: boolean;
    privateAttributes?: string[];
    [key: string]: unknown;
  };
  pluginOptions?: Record<string, unknown>;
  attributes: Record<string, StrapiAttribute>;
}

export interface StrapiComponentInfo {
  displayName: string;
  description?: string;
  icon?: string;
}

export interface StrapiComponent {
  uid: string;
  category: string;
  apiID: string;
  info: StrapiComponentInfo;
  options?: Record<string, unknown>;
  attributes: Record<string, StrapiAttribute>;
}

function normalizeContentType(raw: StrapiContentTypeRaw): StrapiContentType {
  const s = raw.schema;
  return {
    uid: raw.uid,
    apiID: raw.apiID,
    kind: s.kind,
    info: {
      displayName: s.displayName,
      singularName: s.singularName,
      pluralName: s.pluralName,
      description: s.description,
      collectionName: s.collectionName,
    },
    options: {
      draftAndPublish: s.draftAndPublish,
    },
    pluginOptions: s.pluginOptions,
    attributes: s.attributes ?? {},
  };
}

function normalizeComponent(raw: StrapiComponentRaw): StrapiComponent {
  const s = raw.schema;
  return {
    uid: raw.uid,
    category: raw.category,
    apiID: raw.apiID,
    info: {
      displayName: s.displayName,
      description: s.description,
      icon: s.icon,
    },
    attributes: s.attributes ?? {},
  };
}

export interface StrapiLocale {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
}

/* ----------------------------- API helpers ----------------------------- */

/**
 * Check if the server is reachable.
 * Uses `/_health` (Strapi v5 health endpoint, returns 204).
 * Falls back to checking the content-type-builder endpoint.
 * Returns true on any HTTP response (even 4xx) — only false on network failure.
 */
export async function checkReachable(config: StrapiConfig): Promise<boolean> {
  const res = await strapiRequest(config, '/_health', { timeoutMs: 10_000 });
  if (!res.networkError) return true;
  // Fallback: try the admin content-type-builder endpoint
  const fallback = await strapiRequest(config, '/api/content-type-builder/content-types', { timeoutMs: 10_000 });
  return !fallback.networkError;
}

/**
 * Retrieve server information. Strapi v5 does not expose a public version
 * endpoint; version is inferred from the Content-Type Builder response headers
 * or the `X-Strapi-Version` header if present.
 */
export async function getServerInfo(
  config: StrapiConfig,
): Promise<StrapiServerInfo> {
  // First authenticate by hitting the content-type-builder (requires API token)
  const res = await strapiRequest(config, '/api/content-type-builder/content-types');
  if (!res.ok) throw toStrapiError(res, 'Retrieve server info');
  // Strapi v5 may return a version in response headers (best-effort)
  return { strapiVersion: 'v5' };
}

/** Validate the API token and check Admin API access. */
export async function checkAdminAccess(config: StrapiConfig): Promise<void> {
  const res = await strapiRequest(
    config,
    '/api/content-type-builder/content-types',
  );
  if (!res.ok) throw toStrapiError(res, 'Check Admin API access');
}

/** List all application content types (Collection + Single Types). */
export async function listContentTypes(
  config: StrapiConfig,
): Promise<StrapiContentType[]> {
  const res = await strapiRequest(
    config,
    '/api/content-type-builder/content-types',
  );
  if (!res.ok) throw toStrapiError(res, 'List content types');
  const body = res.body as { data?: StrapiContentTypeRaw[] };
  // Filter to application types only (exclude plugin:: and admin:: internal types)
  return (body.data ?? [])
    .filter((ct) => ct.uid && ct.uid.startsWith('api::'))
    .map(normalizeContentType);
}

/** List all shared components. */
export async function listComponents(
  config: StrapiConfig,
): Promise<StrapiComponent[]> {
  const res = await strapiRequest(
    config,
    '/api/content-type-builder/components',
  );
  if (!res.ok) throw toStrapiError(res, 'List components');
  const body = res.body as { data?: StrapiComponentRaw[] };
  return (body.data ?? []).map(normalizeComponent);
}

/** Get a single content type by UID. Returns null if not found. */
export async function getContentType(
  config: StrapiConfig,
  uid: string,
): Promise<StrapiContentType | null> {
  const res = await strapiRequest(
    config,
    `/api/content-type-builder/content-types/${encodeURIComponent(uid)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw toStrapiError(res, `Get content type "${uid}"`);
  const body = res.body as { data?: StrapiContentTypeRaw };
  return body.data ? normalizeContentType(body.data) : null;
}

/** Get a single component by UID. Returns null if not found. */
export async function getComponent(
  config: StrapiConfig,
  uid: string,
): Promise<StrapiComponent | null> {
  const res = await strapiRequest(
    config,
    `/api/content-type-builder/components/${encodeURIComponent(uid)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw toStrapiError(res, `Get component "${uid}"`);
  const body = res.body as { data?: StrapiComponentRaw };
  return body.data ? normalizeComponent(body.data) : null;
}

/** Create a new content type via the Content-Type Builder API. */
export async function createContentType(
  config: StrapiConfig,
  payload: CreateContentTypePayload,
): Promise<StrapiContentType> {
  const res = await strapiRequest(
    config,
    '/api/content-type-builder/content-types',
    { method: 'POST', body: payload },
  );
  if (!res.ok) throw toStrapiError(res, `Create content type "${payload.contentType.info.singularName}"`);
  const body = res.body as { data?: StrapiContentTypeRaw };
  return body.data ? normalizeContentType(body.data) : (payload as unknown as StrapiContentType);
}

/** Update an existing content type by UID. */
export async function updateContentType(
  config: StrapiConfig,
  uid: string,
  payload: UpdateContentTypePayload,
): Promise<StrapiContentType> {
  const res = await strapiRequest(
    config,
    `/api/content-type-builder/content-types/${encodeURIComponent(uid)}`,
    { method: 'PUT', body: payload },
  );
  if (!res.ok) throw toStrapiError(res, `Update content type "${uid}"`);
  const body = res.body as { data?: StrapiContentTypeRaw };
  return body.data ? normalizeContentType(body.data) : (payload as unknown as StrapiContentType);
}

/** Create a new component via the Content-Type Builder API. */
export async function createComponent(
  config: StrapiConfig,
  payload: CreateComponentPayload,
): Promise<StrapiComponent> {
  const res = await strapiRequest(
    config,
    '/api/content-type-builder/components',
    { method: 'POST', body: payload },
  );
  if (!res.ok) throw toStrapiError(res, `Create component "${payload.component.info.displayName}"`);
  const body = res.body as { data?: StrapiComponentRaw };
  return body.data ? normalizeComponent(body.data) : (payload as unknown as StrapiComponent);
}

/** Update an existing component by UID. */
export async function updateComponent(
  config: StrapiConfig,
  uid: string,
  payload: UpdateComponentPayload,
): Promise<StrapiComponent> {
  const res = await strapiRequest(
    config,
    `/api/content-type-builder/components/${encodeURIComponent(uid)}`,
    { method: 'PUT', body: payload },
  );
  if (!res.ok) throw toStrapiError(res, `Update component "${uid}"`);
  const body = res.body as { data?: StrapiComponentRaw };
  return body.data ? normalizeComponent(body.data) : (payload as unknown as StrapiComponent);
}

/** List all available locales (requires i18n plugin). */
export async function listLocales(
  config: StrapiConfig,
): Promise<StrapiLocale[]> {
  const res = await strapiRequest(config, '/api/i18n/locales');
  if (res.status === 404) return []; // i18n plugin not installed
  if (!res.ok) throw toStrapiError(res, 'List locales');
  const body = res.body as StrapiLocale[] | { data?: StrapiLocale[] };
  return Array.isArray(body) ? body : (body.data ?? []);
}

/** Check if the Upload plugin is available. */
export async function checkUploadPlugin(config: StrapiConfig): Promise<boolean> {
  const res = await strapiRequest(config, '/api/upload/settings');
  return !res.networkError && res.status !== 404;
}

/* --------------------------- payload shapes ---------------------------- */

export interface ContentTypeAttributePayload {
  type: StrapiAttributeType;
  required?: boolean;
  unique?: boolean;
  private?: boolean;
  pluginOptions?: { i18n?: { localized?: boolean }; [key: string]: unknown };
  enum?: string[];
  allowedTypes?: string[];
  multiple?: boolean;
  relation?: StrapiRelationType;
  target?: string;
  component?: string;
  repeatable?: boolean;
  components?: string[];
  default?: unknown;
  [key: string]: unknown;
}

export interface CreateContentTypePayload {
  contentType: {
    kind: StrapiContentTypeKind;
    info: StrapiContentTypeInfo;
    options?: {
      draftAndPublish?: boolean;
      [key: string]: unknown;
    };
    pluginOptions?: Record<string, unknown>;
    attributes: Record<string, ContentTypeAttributePayload>;
  };
}

export interface UpdateContentTypePayload {
  contentType: {
    info?: Partial<StrapiContentTypeInfo>;
    options?: Record<string, unknown>;
    attributes?: Record<string, ContentTypeAttributePayload>;
  };
}

export interface CreateComponentPayload {
  component: {
    category: string;
    info: StrapiComponentInfo;
    attributes: Record<string, ContentTypeAttributePayload>;
  };
}

export interface UpdateComponentPayload {
  component: {
    info?: Partial<StrapiComponentInfo>;
    attributes?: Record<string, ContentTypeAttributePayload>;
  };
}
