import { z } from 'zod';

export const AI_PROVIDER_KEYS = [
  'microsoft-foundry',
  'vertex-ai-google',
] as const;
export const aiProviderSchema = z.enum(AI_PROVIDER_KEYS);
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const foundryProviderConfigSchema = z.object({
  project_endpoint: z.string().trim().optional().nullable().default(''),
  agent_id: z.string().trim().optional().nullable().default(''),
});

export type FoundryProviderConfig = z.infer<typeof foundryProviderConfigSchema>;

export const vertexProviderConfigSchema = z.object({
  project: z.string().trim().optional().nullable().default(''),
  location: z.string().trim().optional().nullable().default(''),
  reasoning_engine: z.string().trim().optional().nullable().default(''),
});

export type VertexProviderConfig = z.infer<typeof vertexProviderConfigSchema>;

export const aiProviderConfigSchema = z.object({
  project_endpoint: z.string().trim().optional().nullable().default(''),
  agent_id: z.string().trim().optional().nullable().default(''),
  project: z.string().trim().optional().nullable().default(''),
  location: z.string().trim().optional().nullable().default(''),
  reasoning_engine: z.string().trim().optional().nullable().default(''),
});
export type AiProviderConfig = z.infer<typeof aiProviderConfigSchema>;

export function buildFoundryProviderConfig(input: {
  project_endpoint?: string | null;
  agent_id?: string | null;
}): AiProviderConfig {
  return {
    project_endpoint: input.project_endpoint ?? '',
    agent_id: input.agent_id ?? '',
    project: '',
    location: '',
    reasoning_engine: '',
  };
}

export function buildVertexProviderConfig(input: {
  project?: string | null;
  location?: string | null;
  reasoning_engine?: string | null;
}): AiProviderConfig {
  return {
    project_endpoint: '',
    agent_id: '',
    project: input.project ?? '',
    location: input.location ?? '',
    reasoning_engine: input.reasoning_engine ?? '',
  };
}

export function getFoundryConfigOrThrow(config: unknown): {
  project_endpoint: string;
  agent_id: string;
} {
  const parsed = foundryProviderConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error('Invalid Microsoft Foundry provider configuration.');
  }

  const project_endpoint = parsed.data.project_endpoint?.trim() || '';
  const agent_id = parsed.data.agent_id?.trim() || '';

  if (!project_endpoint || !agent_id) {
    throw new Error(
      'Microsoft Foundry configuration requires a project endpoint and agent ID.',
    );
  }

  return { project_endpoint, agent_id };
}

export function getVertexConfigOrThrow(config: unknown): {
  project: string;
  location: string;
  reasoning_engine: string;
} {
  const parsed = vertexProviderConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error('Invalid Vertex AI provider configuration.');
  }

  const project = parsed.data.project?.trim() || '';
  const location = parsed.data.location?.trim() || '';
  const reasoning_engine = parsed.data.reasoning_engine?.trim() || '';

  if (!project || !location || !reasoning_engine) {
    throw new Error(
      'Vertex AI configuration requires project, location, and reasoning engine.',
    );
  }

  return { project, location, reasoning_engine };
}

export const AI_PROVIDER_OPTIONS: Array<{ value: AiProvider; label: string }> =
  [
    { value: 'microsoft-foundry', label: 'Microsoft Foundry' },
    { value: 'vertex-ai-google', label: 'Vertex AI (Google)' },
  ];

export const AI_PROVIDER_BADGE_STYLES: Record<AiProvider, string> = {
  'microsoft-foundry':
    'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'vertex-ai-google':
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export function getAiProviderLabel(provider: AiProvider) {
  return (
    AI_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ??
    provider
  );
}

// ---------------------------------------------------------------------------
// Search Application Providers
// ---------------------------------------------------------------------------

export const SEARCH_PROVIDER_KEYS = ['vertex-ai-agent-search'] as const;
export const searchProviderSchema = z.enum(SEARCH_PROVIDER_KEYS);
export type SearchProvider = z.infer<typeof searchProviderSchema>;

export const vertexSearchProviderConfigSchema = z.object({
  gcp_project_id: z.string().trim().optional().nullable().default(''),
  location: z.string().trim().optional().nullable().default('global'),
  collection_id: z
    .string()
    .trim()
    .optional()
    .nullable()
    .default('default_collection'),
  engine_id: z.string().trim().optional().nullable().default(''),
  serving_config_id: z
    .string()
    .trim()
    .optional()
    .nullable()
    .default('default_search'),
  /**
   * Explicit allowlist of GCS bucket names (or gs://bucket/prefix patterns)
   * whose objects this search app is permitted to sign download URLs for.
   * An empty list means downloads are BLOCKED — the admin must opt-in.
   */
  allowed_gcs_buckets: z.array(z.string().trim()).optional().default([]),
});

export type VertexSearchProviderConfig = z.infer<
  typeof vertexSearchProviderConfigSchema
>;

export const searchProviderConfigSchema = vertexSearchProviderConfigSchema;
export type SearchProviderConfig = z.infer<typeof searchProviderConfigSchema>;

export function buildVertexSearchProviderConfig(input: {
  gcp_project_id?: string | null;
  location?: string | null;
  collection_id?: string | null;
  engine_id?: string | null;
  serving_config_id?: string | null;
  allowed_gcs_buckets?: string[];
}): SearchProviderConfig {
  return {
    gcp_project_id: input.gcp_project_id ?? '',
    location: input.location ?? 'global',
    collection_id: input.collection_id ?? 'default_collection',
    engine_id: input.engine_id ?? '',
    serving_config_id: input.serving_config_id ?? 'default_search',
    allowed_gcs_buckets: input.allowed_gcs_buckets ?? [],
  };
}

export function getVertexSearchConfigOrThrow(config: unknown): {
  gcp_project_id: string;
  location: string;
  collection_id: string;
  engine_id: string;
  serving_config_id: string;
  allowed_gcs_buckets: string[];
} {
  const parsed = vertexSearchProviderConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error('Invalid Vertex AI Agent Search provider configuration.');
  }

  const gcp_project_id = parsed.data.gcp_project_id?.trim() || '';
  const location = parsed.data.location?.trim() || 'global';
  const collection_id =
    parsed.data.collection_id?.trim() || 'default_collection';
  const engine_id = parsed.data.engine_id?.trim() || '';
  // 'default_config' was the old default before we renamed it to 'default_search'.
  // Silently migrate stale stored values so existing records work without re-saving.
  const rawServingConfigId = parsed.data.serving_config_id?.trim() || '';
  const serving_config_id =
    rawServingConfigId === '' || rawServingConfigId === 'default_config'
      ? 'default_search'
      : rawServingConfigId;

  const allowed_gcs_buckets: string[] =
    Array.isArray(parsed.data.allowed_gcs_buckets)
      ? (parsed.data.allowed_gcs_buckets as string[]).filter(Boolean)
      : [];

  if (!gcp_project_id || !engine_id) {
    throw new Error(
      'Vertex AI Agent Search configuration requires a GCP project ID and engine (app) ID.',
    );
  }

  return { gcp_project_id, location, collection_id, engine_id, serving_config_id, allowed_gcs_buckets };
}

export const SEARCH_PROVIDER_OPTIONS: Array<{
  value: SearchProvider;
  label: string;
}> = [
  {
    value: 'vertex-ai-agent-search',
    label: 'Vertex AI Agent Search (Google)',
  },
];

export const SEARCH_PROVIDER_BADGE_STYLES: Record<SearchProvider, string> = {
  'vertex-ai-agent-search':
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export function getSearchProviderLabel(provider: SearchProvider) {
  return (
    SEARCH_PROVIDER_OPTIONS.find((option) => option.value === provider)
      ?.label ?? provider
  );
}

