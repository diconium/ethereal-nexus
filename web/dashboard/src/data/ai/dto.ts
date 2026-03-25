import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  projectAiEnvironmentFeatureFlags,
  projectAiChatbots,
  projectAiChatbotApiSettings,
  projectAiChatbotStats,
  projectAiCatalogues,
  projectAiCatalogueVersions,
  projectAiAuthorDialogs,
  projectAiContentAdvisorAgentConfigs,
  projectAiContentAdvisorSchedules,
  projectAiContentAdvisorRuns,
  projectAiContentAdvisorAgentRuns,
  projectAiContentAdvisorIssues,
} from './schema';
import { catalogueDataSchema } from './catalogue';
import {
  CONTENT_ADVISOR_AGENT_KEYS,
  CONTENT_ADVISOR_ISSUE_TYPES,
  CONTENT_ADVISOR_SEVERITIES,
} from './content-advisor';
import { aiProviderConfigSchema, aiProviderSchema } from './provider';

export const PROJECT_AI_FEATURE_KEYS = [
  'chatbots',
  'catalogues',
  'author-dialogs',
  'content-advisor',
  'demos',
] as const;

export const projectAiFeatureKeySchema = z.enum(PROJECT_AI_FEATURE_KEYS);
export type ProjectAiFeatureKey = z.infer<typeof projectAiFeatureKeySchema>;

export const projectAiFeatureFlagSchema = createSelectSchema(
  projectAiEnvironmentFeatureFlags,
).extend({ key: projectAiFeatureKeySchema });
export type ProjectAiFeatureFlag = z.infer<typeof projectAiFeatureFlagSchema>;

const slugSchema = z
  .string()
  .min(2)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const chatbotSchema = createSelectSchema(projectAiChatbots).extend({
  provider: aiProviderSchema,
  provider_config: aiProviderConfigSchema,
});
export type Chatbot = z.infer<typeof chatbotSchema>;

export const chatbotApiSettingsSchema = createSelectSchema(
  projectAiChatbotApiSettings,
);
export type ChatbotApiSettings = z.infer<typeof chatbotApiSettingsSchema>;

export const chatbotStatsSchema = createSelectSchema(projectAiChatbotStats);
export type ChatbotStats = z.infer<typeof chatbotStatsSchema>;

export const chatbotStatsSummarySchema = z.object({
  chatbot_id: z.string().uuid(),
  request_count: z.number().int(),
  success_count: z.number().int(),
  error_count: z.number().int(),
  rate_limited_count: z.number().int(),
  total_tokens: z.number().int(),
  avg_latency_ms: z.number(),
  success_rate: z.number(),
  last_request_at: z.string().nullable(),
});
export type ChatbotStatsSummary = z.infer<typeof chatbotStatsSummarySchema>;

export const chatbotApiSettingsInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    project_id: z.string().uuid(),
    environment_id: z.string().uuid(),
    chatbot_id: z.string().uuid(),
    rate_limit_enabled: z.boolean().default(true),
    rate_limit_max_requests: z.number().int().min(1).max(10000),
    rate_limit_window_seconds: z.number().int().min(1).max(86400),
    rate_limit_use_ip: z.boolean().default(true),
    rate_limit_use_session_cookie: z.boolean().default(true),
    rate_limit_use_fingerprint: z.boolean().default(false),
    fingerprint_header_name: z.string().trim().min(1).max(120),
    message_size_limit_enabled: z.boolean().default(true),
    max_message_characters: z.number().int().min(1).max(200000),
    max_request_body_bytes: z.number().int().min(1).max(1000000),
    session_request_cap_enabled: z.boolean().default(false),
    session_request_cap_max_requests: z.number().int().min(1).max(100000),
    session_request_cap_window_seconds: z.number().int().min(1).max(604800),
    ip_daily_token_budget_enabled: z.boolean().default(false),
    ip_daily_token_budget: z.number().int().min(1).max(10000000),
    temporary_block_enabled: z.boolean().default(true),
    temporary_block_violation_threshold: z.number().int().min(1).max(1000),
    temporary_block_window_seconds: z.number().int().min(1).max(604800),
    temporary_block_duration_seconds: z.number().int().min(1).max(604800),
  })
  .superRefine((value, ctx) => {
    if (
      !value.rate_limit_use_ip &&
      !value.rate_limit_use_session_cookie &&
      !value.rate_limit_use_fingerprint
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enable at least one identity source for rate limiting.',
        path: ['rate_limit_use_ip'],
      });
    }

    if (
      value.rate_limit_use_fingerprint &&
      !value.fingerprint_header_name.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Fingerprint header name is required when fingerprint rate limiting is enabled.',
        path: ['fingerprint_header_name'],
      });
    }

    if (value.max_request_body_bytes < value.max_message_characters) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Request body bytes should be greater than or equal to the message character limit.',
        path: ['max_request_body_bytes'],
      });
    }
  });
export type ChatbotApiSettingsInput = z.infer<
  typeof chatbotApiSettingsInputSchema
>;

export const chatbotInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  slug: slugSchema,
  public_slug: slugSchema,
  provider: aiProviderSchema,
  project_endpoint: z.string().url(),
  agent_id: z.string().min(1),
  enabled: z.boolean().default(true),
});
export type ChatbotInput = z.infer<typeof chatbotInputSchema>;

export const catalogueSchema = createSelectSchema(projectAiCatalogues).extend({
  provider: aiProviderSchema,
  provider_config: aiProviderConfigSchema,
});
export type Catalogue = z.infer<typeof catalogueSchema>;

export const catalogueInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  provider: aiProviderSchema,
  project_endpoint: z.string().url().optional().nullable().or(z.literal('')),
  provider_agent_id: z.string().optional().nullable(),
  system_prompt: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  api_url: z.string().url().optional().nullable().or(z.literal('')),
  agent_principal_id: z.string().optional().nullable(),
  tenant_id: z.string().optional().nullable(),
  activity_protocol_endpoint: z.string().optional().nullable(),
  responses_api_endpoint: z.string().optional().nullable(),
  show_in_sidebar: z.boolean().default(false),
});
export type CatalogueInput = z.infer<typeof catalogueInputSchema>;

export const catalogueVersionSchema = createSelectSchema(
  projectAiCatalogueVersions,
).extend({ data: catalogueDataSchema });
export type CatalogueVersion = z.infer<typeof catalogueVersionSchema>;

export const authorDialogSchema = createSelectSchema(
  projectAiAuthorDialogs,
).extend({
  provider: aiProviderSchema,
  provider_config: aiProviderConfigSchema,
});
export type AuthorDialog = z.infer<typeof authorDialogSchema>;

export const authorDialogInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  slug: slugSchema,
  public_slug: slugSchema,
  provider: aiProviderSchema,
  project_endpoint: z.string().url().optional().nullable().or(z.literal('')),
  provider_agent_id: z.string().optional().nullable(),
  system_prompt: z.string().min(1),
  enabled: z.boolean().default(true),
});
export type AuthorDialogInput = z.infer<typeof authorDialogInputSchema>;

export const contentAdvisorAgentKeySchema = z.enum(CONTENT_ADVISOR_AGENT_KEYS);
export const contentAdvisorIssueTypeSchema = z.enum(
  CONTENT_ADVISOR_ISSUE_TYPES,
);
export const contentAdvisorSeveritySchema = z.enum(CONTENT_ADVISOR_SEVERITIES);

export const contentAdvisorAgentConfigSchema = createSelectSchema(
  projectAiContentAdvisorAgentConfigs,
).extend({
  key: contentAdvisorAgentKeySchema,
  provider: aiProviderSchema,
  provider_config: aiProviderConfigSchema,
});
export type ContentAdvisorAgentConfig = z.infer<
  typeof contentAdvisorAgentConfigSchema
>;

export const contentAdvisorAgentConfigInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  key: contentAdvisorAgentKeySchema,
  name: z.string().min(2),
  description: z.string(),
  provider: aiProviderSchema,
  project_endpoint: z.string().url().optional().nullable().or(z.literal('')),
  provider_agent_id: z.string().optional().nullable(),
  prompt: z.string().min(1),
  enabled: z.boolean().default(true),
});
export type ContentAdvisorAgentConfigInput = z.infer<
  typeof contentAdvisorAgentConfigInputSchema
>;

export const contentAdvisorScheduleSchema = createSelectSchema(
  projectAiContentAdvisorSchedules,
).extend({
  pages: z.array(z.string().url()).default([]),
});
export type ContentAdvisorSchedule = z.infer<
  typeof contentAdvisorScheduleSchema
>;

export const contentAdvisorScheduleInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  label: z.string().min(2),
  cron: z.string().min(5),
  focus_instruction: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  pages: z.array(z.string().url()).min(1),
});
export type ContentAdvisorScheduleInput = z.infer<
  typeof contentAdvisorScheduleInputSchema
>;

export const contentAdvisorRunSchema = createSelectSchema(
  projectAiContentAdvisorRuns,
);
export type ContentAdvisorRun = z.infer<typeof contentAdvisorRunSchema>;

export const contentAdvisorAgentRunSchema = createSelectSchema(
  projectAiContentAdvisorAgentRuns,
);
export type ContentAdvisorAgentRun = z.infer<
  typeof contentAdvisorAgentRunSchema
>;

export const contentAdvisorIssueSchema = createSelectSchema(
  projectAiContentAdvisorIssues,
).extend({
  issue_type: contentAdvisorIssueTypeSchema,
  severity: contentAdvisorSeveritySchema,
});
export type ContentAdvisorIssue = z.infer<typeof contentAdvisorIssueSchema>;

export const contentAdvisorIssueInputSchema = z.object({
  page_url: z.string().url(),
  page_title: z.string().optional().nullable(),
  issue_type: contentAdvisorIssueTypeSchema,
  severity: contentAdvisorSeveritySchema,
  title: z.string().min(2),
  description: z.string().min(1),
  suggestion: z.string().min(1),
  reasoning: z.string().min(1),
});
export type ContentAdvisorIssueInput = z.infer<
  typeof contentAdvisorIssueInputSchema
>;
