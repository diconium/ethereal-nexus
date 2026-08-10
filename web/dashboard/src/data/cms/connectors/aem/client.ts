/**
 * Minimal AEM HTTP client used by the connector's validation/discovery tasks.
 *
 * Server-only. Handles Basic and OAuth (bearer) auth, request timeouts, and
 * optional self-signed TLS certificates.
 */

import type { AemConfig } from '../../config';
import { validateEndpointUrl, SsrfBlockedError } from '@/lib/ssrf-guard';

export type AemAuth = AemConfig['auth'];

export type AemRequestResult = {
  ok: boolean;
  status: number;
  /** True when the request failed before receiving any response (network/TLS/timeout). */
  networkError: boolean;
  errorMessage?: string;
  text?: string;
};

/**
 * Build an undici dispatcher that accepts self-signed certificates.
 * Returns undefined when not needed or unavailable.
 */
async function buildInsecureDispatcher(): Promise<unknown | undefined> {
  try {
    // Indirect specifier so TS does not attempt to resolve the (untyped)
    // 'undici' module at compile time; Next bundles it at runtime.
    const moduleName = 'undici';
    const undici = (await import(/* webpackIgnore: true */ moduleName)) as {
      Agent: new (opts: unknown) => unknown;
    };
    return new undici.Agent({ connect: { rejectUnauthorized: false } });
  } catch {
    return undefined;
  }
}

function authHeaders(auth: AemAuth): Record<string, string> {
  if (auth.method === 'basic') {
    const token = Buffer.from(`${auth.username}:${auth.password}`).toString(
      'base64',
    );
    return { Authorization: `Basic ${token}` };
  }
  // OAuth: the clientSecret is treated as a bearer token for this probe.
  return { Authorization: `Bearer ${auth.clientSecret}` };
}

/**
 * Perform a request against the AEM author instance.
 * Never throws — network/TLS/timeout failures are returned as `networkError`.
 */
export async function aemRequest(
  config: AemConfig,
  path: string,
  options: {
    method?: string;
    withAuth?: boolean;
    accept?: string;
    body?: string;
    contentType?: string;
  } = {},
): Promise<AemRequestResult> {
  const { method = 'GET', withAuth = true, accept, body, contentType } =
    options;

  // SSRF protection — validate before any network call.
  try {
    validateEndpointUrl(config.authorUrl);
  } catch (e) {
    const message = e instanceof SsrfBlockedError
      ? e.message
      : 'Disallowed endpoint URL';
    return { ok: false, status: 0, networkError: true, errorMessage: message };
  }

  const base = config.authorUrl.replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 30000,
  );

  const headers: Record<string, string> = {};
  if (withAuth) {
    Object.assign(headers, authHeaders(config.auth));
  }
  if (accept) {
    headers.Accept = accept;
  }
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const fetchInit: RequestInit & { dispatcher?: unknown } = {
    method,
    headers,
    body,
    signal: controller.signal,
    redirect: 'manual',
  };

  if (config.allowSelfSignedSsl && url.startsWith('https://')) {
    const dispatcher = await buildInsecureDispatcher();
    if (dispatcher) {
      fetchInit.dispatcher = dispatcher;
    }
  }

  try {
    const response = await fetch(url, fetchInit as RequestInit);
    let text: string | undefined;
    try {
      text = await response.text();
    } catch {
      text = undefined;
    }
    return {
      ok: response.ok || (response.status >= 300 && response.status < 400),
      status: response.status,
      networkError: false,
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

/** Parse a JSON response body, returning undefined on failure. */
function parseJson<T = unknown>(res: AemRequestResult): T | undefined {
  if (!res.text) {
    return undefined;
  }
  try {
    return JSON.parse(res.text) as T;
  } catch {
    return undefined;
  }
}

/**
 * Run an AEM QueryBuilder query and return the total hit count.
 * Throws on network/permission errors so the discovery task can report them.
 */
export async function aemQueryBuilderCount(
  config: AemConfig,
  params: Record<string, string>,
): Promise<number> {
  const search = new URLSearchParams({
    ...params,
    'p.limit': '-1',
    'p.hits': 'none',
  });
  const res = await aemRequest(
    config,
    `/bin/querybuilder.json?${search.toString()}`,
    { withAuth: true, accept: 'application/json' },
  );
  if (res.networkError) {
    throw new Error(res.errorMessage ?? 'QueryBuilder request failed');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Access denied');
  }
  if (!res.ok) {
    throw new Error(`QueryBuilder returned HTTP ${res.status}`);
  }
  const body = parseJson<{ total?: number; results?: number }>(res);
  return body?.total ?? body?.results ?? 0;
}

/**
 * Count immediate child nodes at a JCR path via the `.1.json` selector,
 * optionally filtering by a `jcr:primaryType`.
 */
export async function aemCountChildren(
  config: AemConfig,
  path: string,
  primaryType?: string,
): Promise<number> {
  const res = await aemRequest(config, `${path}.1.json`, {
    withAuth: true,
    accept: 'application/json',
  });
  if (res.networkError) {
    throw new Error(res.errorMessage ?? 'Request failed');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Access denied');
  }
  if (res.status === 404) {
    return 0;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = parseJson<Record<string, unknown>>(res);
  if (!body) {
    return 0;
  }
  let count = 0;
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('jcr:') || key.startsWith('cq:') || key === 'rep:policy') {
      continue;
    }
    if (value && typeof value === 'object') {
      if (primaryType) {
        const child = value as Record<string, unknown>;
        if (child['jcr:primaryType'] === primaryType) {
          count += 1;
        }
      } else {
        count += 1;
      }
    }
  }
  return count;
}

/** A single QueryBuilder hit (a node with useful properties). */
export type AemHit = {
  path: string;
  name: string;
  title?: string;
  properties: Record<string, unknown>;
};

/**
 * Run a QueryBuilder query and return the hits (capped by `limit`) plus the
 * total match count. Uses `p.hits=selective` with the requested properties.
 */
export async function aemQueryBuilderHits(
  config: AemConfig,
  params: Record<string, string>,
  limit = 500,
): Promise<{ total: number; hits: AemHit[] }> {
  const search = new URLSearchParams({
    ...params,
    'p.limit': String(limit),
    'p.hits': 'full',
    'p.nodedepth': '1',
    'p.guessTotal': 'true',
  });
  const res = await aemRequest(
    config,
    `/bin/querybuilder.json?${search.toString()}`,
    { withAuth: true, accept: 'application/json' },
  );
  if (res.networkError) {
    throw new Error(res.errorMessage ?? 'QueryBuilder request failed');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Access denied');
  }
  if (!res.ok) {
    throw new Error(`QueryBuilder returned HTTP ${res.status}`);
  }
  const body = parseJson<{
    total?: number;
    results?: number;
    hits?: Array<Record<string, unknown>>;
  }>(res);
  const rawHits = Array.isArray(body?.hits) ? body!.hits : [];
  const hits: AemHit[] = rawHits.map((h) => {
    const path = typeof h['jcr:path'] === 'string' ? (h['jcr:path'] as string) : '';
    const name = path ? path.split('/').filter(Boolean).pop() ?? path : '';
    const content = (h['jcr:content'] as Record<string, unknown>) ?? {};
    const title =
      (content['jcr:title'] as string) ??
      (h['jcr:title'] as string) ??
      undefined;
    return { path, name, title, properties: h };
  });
  return { total: body?.total ?? body?.results ?? hits.length, hits };
}

/** List immediate child nodes at a path, returning entries. */
export async function aemListChildren(
  config: AemConfig,
  path: string,
  primaryType?: string,
): Promise<Array<{ name: string; path: string; primaryType?: string }>> {
  const res = await aemRequest(config, `${path}.1.json`, {
    withAuth: true,
    accept: 'application/json',
  });
  if (res.networkError) {
    throw new Error(res.errorMessage ?? 'Request failed');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Access denied');
  }
  if (res.status === 404) {
    return [];
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = parseJson<Record<string, unknown>>(res);
  if (!body) {
    return [];
  }
  const entries: Array<{ name: string; path: string; primaryType?: string }> =
    [];
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('jcr:') || key.startsWith('cq:') || key === 'rep:policy') {
      continue;
    }
    if (value && typeof value === 'object') {
      const child = value as Record<string, unknown>;
      const pt = child['jcr:primaryType'] as string | undefined;
      if (primaryType && pt !== primaryType) {
        continue;
      }
      entries.push({ name: key, path: `${path}/${key}`, primaryType: pt });
    }
  }
  return entries;
}

/**
 * Fetch a JCR subtree as JSON at the given depth (`<path>.<depth>.json`).
 * Returns the parsed object, or undefined on 404 / parse failure.
 * Throws on network / permission errors.
 */
export async function aemFetchJson(
  config: AemConfig,
  path: string,
  depth = 1,
): Promise<Record<string, unknown> | undefined> {
  const res = await aemRequest(config, `${path}.${depth}.json`, {
    withAuth: true,
    accept: 'application/json',
  });
  if (res.networkError) {
    throw new Error(res.errorMessage ?? 'Request failed');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Access denied');
  }
  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return parseJson<Record<string, unknown>>(res);
}

/**
 * Recursively walk a JSON subtree, collecting every `sling:resourceType` value
 * found on any node (used to derive which components a template composes).
 */
export function collectResourceTypes(
  tree: Record<string, unknown> | undefined,
  acc = new Set<string>(),
): Set<string> {
  if (!tree) return acc;
  for (const [key, value] of Object.entries(tree)) {
    if (key === 'sling:resourceType' && typeof value === 'string') {
      acc.add(value);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectResourceTypes(value as Record<string, unknown>, acc);
    }
  }
  return acc;
}

/**
 * Recursively collect `cq:allowedComponents` arrays across a subtree (declared
 * on containers / policies), returning the flattened set of resource types.
 */
export function collectAllowedComponents(
  tree: Record<string, unknown> | undefined,
  acc = new Set<string>(),
): Set<string> {
  if (!tree) return acc;
  for (const [key, value] of Object.entries(tree)) {
    if (key === 'cq:allowedComponents' && Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') acc.add(entry);
      }
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectAllowedComponents(value as Record<string, unknown>, acc);
    }
  }
  return acc;
}
