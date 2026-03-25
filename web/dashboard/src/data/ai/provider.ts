import { z } from 'zod';

export const AI_PROVIDER_KEYS = ['microsoft-foundry'] as const;
export const aiProviderSchema = z.enum(AI_PROVIDER_KEYS);
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const foundryProviderConfigSchema = z.object({
  project_endpoint: z.string().trim().optional().nullable().default(''),
  agent_id: z.string().trim().optional().nullable().default(''),
});

export type FoundryProviderConfig = z.infer<typeof foundryProviderConfigSchema>;

export const aiProviderConfigSchema = foundryProviderConfigSchema;
export type AiProviderConfig = FoundryProviderConfig;

export function buildFoundryProviderConfig(input: {
  project_endpoint?: string | null;
  agent_id?: string | null;
}): AiProviderConfig {
  return {
    project_endpoint: input.project_endpoint ?? '',
    agent_id: input.agent_id ?? '',
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

export const AI_PROVIDER_OPTIONS: Array<{ value: AiProvider; label: string }> =
  [{ value: 'microsoft-foundry', label: 'Microsoft Foundry' }];

export const AI_PROVIDER_BADGE_STYLES: Record<AiProvider, string> = {
  'microsoft-foundry':
    'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

export function getAiProviderLabel(provider: AiProvider) {
  return (
    AI_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ??
    provider
  );
}
