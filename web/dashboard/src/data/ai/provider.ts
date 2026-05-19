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
