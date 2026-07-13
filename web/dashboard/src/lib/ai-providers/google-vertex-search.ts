// Uses Discovery Engine REST API — same endpoint as the working curl command.
// REST is used instead of gRPC because it uses standard Bearer token auth
// which works reliably with service account JSON keys stored per-app in the DB.
import { getDiscoveryEngineAccessToken } from '@/lib/google-discovery-auth';
import { getVertexSearchConfigOrThrow } from '@/data/ai/provider';
import { logger } from '@/lib/logger';

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  /** Web URL (https://) for the document, or null when unavailable. */
  link: string | null;
  /**
   * Public HTTPS download URL when the GCS bucket is public, or null.
   * For private buckets use the /download endpoint which generates a signed URL.
   */
  publicDownloadUrl: string | null;
  /** Original GCS URI (gs://bucket/path) for Cloud Storage-indexed docs, or null. */
  gcsUri: string | null;
  document: Record<string, unknown>;
};

export type SearchSummaryCitation = {
  startIndex?: number;
  endIndex?: number;
  sources?: Array<{ referenceIndex?: number }>;
};

export type SearchSummaryReference = {
  /** 1-based index matching the [N] citation numbers in the summary text */
  index: number;
  title: string;
  /** URL to the source document, or null when unavailable. */
  link: string | null;
};

export type SearchSummary = {
  text: string;
  /** Resolved references in citation order — [1] → references[0], etc. */
  references: SearchSummaryReference[];
};

export type SearchResponse = {
  results: SearchResult[];
  totalSize: number;
  nextPageToken?: string;
  summary?: SearchSummary;
};

// ---------------------------------------------------------------------------
// Access token — see src/lib/google-discovery-auth.ts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// REST search
// ---------------------------------------------------------------------------

export async function performVertexSearch(input: {
  providerConfig: unknown;
  credentialsJson?: string | null;
  searchQuery: string;
  pageSize?: number;
  /** When true, requests a generated summary from the LLM (slower). Default false. */
  includeSummary?: boolean;
}): Promise<SearchResponse> {
  const config = getVertexSearchConfigOrThrow(input.providerConfig);

  const {
    gcp_project_id,
    location,
    collection_id,
    engine_id,
    serving_config_id,
  } = config;

  const apiBase =
    location === 'global'
      ? 'https://discoveryengine.googleapis.com'
      : `https://${location}-discoveryengine.googleapis.com`;

  // Mirrors the working curl endpoint exactly:
  // v1alpha/projects/{project}/locations/{location}/collections/{collection}/engines/{engine}/servingConfigs/{config}:search
  const url =
    `${apiBase}/v1alpha/projects/${gcp_project_id}/locations/${location}` +
    `/collections/${collection_id}/engines/${engine_id}` +
    `/servingConfigs/${serving_config_id}:search`;

  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 100);

  logger.info('Performing Vertex AI Agent Search query (REST)', {
    provider: 'vertex-ai-agent-search',
    gcpProject: gcp_project_id,
    location,
    collectionId: collection_id,
    engineId: engine_id,
    servingConfigId: serving_config_id,
    hasCredentials: !!(input.credentialsJson?.trim() || process.env.GOOGLE_SEARCH_CREDENTIALS_JSON),
    queryLength: input.searchQuery.length,
    pageSize,
  });

  // Obtain a short-lived Bearer token from the service account key
  let token: string;
  try {
    token = await getDiscoveryEngineAccessToken(input.credentialsJson);
  } catch (err) {
    const msg = (err as Error).message;
    logger.error('Failed to obtain Discovery Engine access token', err as Error, {
      provider: 'vertex-ai-agent-search',
      gcpProject: gcp_project_id,
    });
    throw new Error(`Credentials error: ${msg}`);
  }

  const body: Record<string, unknown> = {
    query: input.searchQuery,
    pageSize,
    spellCorrectionSpec: { mode: 'AUTO' },
    contentSearchSpec: {
      snippetSpec: { returnSnippet: true },
      ...(input.includeSummary && {
        summarySpec: {
          summaryResultCount: 5,
          includeCitations: true,
          ignoreAdversarialQuery: true,
          ignoreNonSummarySeekingQuery: true,
          modelSpec: { version: 'stable' },
        },
      }),
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error('Discovery Engine fetch error', err as Error, {
      provider: 'vertex-ai-agent-search',
      url,
    });
    throw new Error('Network error reaching Discovery Engine. Please try again.');
  }

  if (!res.ok) {
    let errorBody: Record<string, unknown> = {};
    try {
      errorBody = await res.json();
    } catch {
      // ignore
    }

    const apiError = (errorBody?.error as Record<string, unknown>) ?? {};
    const code = apiError.code as number | undefined;
    const message = (apiError.message as string | undefined) ?? res.statusText;

    logger.error('Discovery Engine REST error', new Error(message), {
      provider: 'vertex-ai-agent-search',
      httpStatus: res.status,
      apiErrorCode: code,
      apiErrorMessage: message,
    });

    const userMessage =
      res.status === 401 || res.status === 403
        ? 'Permission denied. Ensure the service account has the Discovery Engine Viewer role on this project.'
        : res.status === 404
          ? `Engine or serving config not found. Verify engine ID "${engine_id}" and serving config "${serving_config_id}" in Google Cloud Console.`
          : `Search failed (HTTP ${res.status}): ${message}`;

    throw new Error(userMessage);
  }

  const data = (await res.json()) as {
    results?: unknown[];
    totalSize?: number;
    nextPageToken?: string;
    summary?: {
      summaryText?: string;
      summaryWithMetadata?: {
        summary?: string;
        citationMetadata?: {
          citations?: Array<{
            startIndex?: number;
            endIndex?: number;
            sources?: Array<{ referenceIndex?: number; document?: string }>;
          }>;
        };
        references?: Array<{
          title?: string;
          document?: string;
          uri?: string;
          chunkContents?: unknown[];
        }>;
      };
    };
  };

  const protoResults = data.results ?? [];
  const totalSize = data.totalSize ?? protoResults.length;

  const results: SearchResult[] = protoResults.map((result: unknown) => {
    const r = result as Record<string, unknown>;
    const doc = (r.document ?? {}) as Record<string, unknown>;

    // REST API returns structData as a plain JS object (already parsed)
    const structData = (doc.structData ?? {}) as Record<string, unknown>;
    const derivedData = (doc.derivedStructData ?? {}) as Record<string, unknown>;
    // document.content.uri holds the original GCS path for Cloud Storage data stores
    const content = (doc.content ?? {}) as Record<string, unknown>;

    const title: string =
      getString(structData.title) ||
      getString(derivedData.title) ||
      getString(structData.name) ||
      getString(doc.name) ||
      '';

    // Snippets come from derivedData.snippets[0].snippet
    const firstSnippet = (derivedData.snippets as unknown[])?.[0] as Record<string, unknown> | undefined;
    const snippet: string =
      getString(firstSnippet?.snippet) ||
      getString(derivedData.snippet) ||
      '';

    // Raw link — prefer explicit HTTP URLs, fall back to null when absent
    const rawLink =
      getString(structData.url) ||
      getString(derivedData.link) ||
      getString(structData.link) ||
      null;

    // GCS URI — content.uri is the canonical field for Cloud Storage-indexed docs
    const gcsUri: string | null =
      getString(content.uri) ||
      (rawLink?.startsWith('gs://') ? rawLink : null) ||
      getString(structData.gcsUri) ||
      null;

    // Web link — only emit when it's a real HTTP/HTTPS URL
    const link: string | null =
      rawLink?.startsWith('http') ? rawLink : null;

    // For public GCS buckets, convert gs://bucket/path → https://storage.googleapis.com/bucket/path
    const publicDownloadUrl: string | null = gcsUri
      ? gcsUri.replace(/^gs:\/\//, 'https://storage.googleapis.com/')
      : null;

    return {
      id: getString(doc.id) || getString(r.id) || '',
      title,
      snippet,
      link,
      gcsUri,
      publicDownloadUrl,
      document: structData as Record<string, unknown>,
    };
  });

  logger.info('Vertex AI Agent Search query complete', {
    provider: 'vertex-ai-agent-search',
    resultCount: results.length,
    totalSize,
    hasSummary: !!data.summary?.summaryText,
  });

  // Build summary with resolved citation references.
  // Discovery Engine returns citations as {startIndex, endIndex, sources:[{referenceIndex}]}
  // where referenceIndex maps into summaryWithMetadata.references[] or into results[].
  let summary: SearchSummary | undefined;

  const rawSummaryText =
    data.summary?.summaryWithMetadata?.summary ?? data.summary?.summaryText;

  if (rawSummaryText) {
    const citations =
      data.summary?.summaryWithMetadata?.citationMetadata?.citations ?? [];
    const apiRefs = data.summary?.summaryWithMetadata?.references ?? [];

    // Collect unique, valid reference indices in the order they first appear.
    // - Skip any source whose referenceIndex is undefined (rather than defaulting
    //   to 0, which would incorrectly attribute it to the first source).
    // - Guard against out-of-bounds access: only include indices that resolve to
    //   at least one of apiRefs[] or results[].
    const seenIndices = new Set<number>();
    const orderedIndices: number[] = [];

    for (const citation of citations) {
      for (const src of citation.sources ?? []) {
        // Skip sources with no explicit index — do not default to 0
        if (src.referenceIndex === undefined || src.referenceIndex === null) continue;

        const idx = src.referenceIndex;

        // Guard: only accept indices that are within bounds of at least one array
        const inApiRefs  = idx >= 0 && idx < apiRefs.length;
        const inResults  = idx >= 0 && idx < results.length;
        if (!inApiRefs && !inResults) continue;

        if (!seenIndices.has(idx)) {
          seenIndices.add(idx);
          orderedIndices.push(idx);
        }
      }
    }

    // Resolve each valid index to a title + link
    const references: SearchSummaryReference[] = orderedIndices.map((refIdx, i) => {
      // apiRefs[refIdx] is guaranteed in-bounds when inApiRefs was true above;
      // results[refIdx] likewise — but both checks are defensive here.
      const apiRef    = refIdx < apiRefs.length  ? apiRefs[refIdx]  : undefined;
      const resultDoc = refIdx < results.length  ? results[refIdx]  : undefined;
      return {
        index: i + 1, // 1-based to match [N] notation in text
        title: apiRef?.title || resultDoc?.title || `Source ${i + 1}`,
        link:  apiRef?.uri   || resultDoc?.link  || null,
      };
    });

    summary = { text: rawSummaryText, references };
  }

  return { results, totalSize, nextPageToken: data.nextPageToken, summary };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}
