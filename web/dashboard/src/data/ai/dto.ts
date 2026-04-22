import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  projectAiEnvironmentFeatureFlags,
  projectAiChatbots,
  projectAiChatbotApiSettings,
  projectAiChatbotAnalyticsConfigs,
  projectAiAnalyticsReviewAgentConfigs,
  projectAiChatbotStats,
  projectAiChatbotSessions,
  projectAiChatbotEvents,
  projectAiChatbotTopicRuleSets,
  projectAiChatbotTopicRules,
  projectAiChatbotUnmatchedReviews,
  projectAiCatalogues,
  projectAiCatalogueVersions,
  projectAiAuthorDialogs,
  projectAiContentAdvisorAgentConfigs,
  projectAiContentAdvisorSchedules,
  projectAiContentAdvisorRuns,
  projectAiContentAdvisorAgentRuns,
  projectAiContentAdvisorIssues,
  projectAiContentAdvisorIssueComments,
  projectAiContentAdvisorIssueDetections,
  projectAiContentAdvisorSettings,
  projectAiPageUrlMappings,
} from './schema';
import { catalogueDataSchema } from './catalogue';
import {
  CONTENT_ADVISOR_AGENT_KEYS,
  CONTENT_ADVISOR_ISSUE_TYPES,
  CONTENT_ADVISOR_ISSUE_STATUSES,
  CONTENT_ADVISOR_SEVERITIES,
} from './content-advisor';

const catalogueApiSlugSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9-]+$/i,
    'Use only the unique endpoint slug, for example card-comparator.',
  );
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

export const chatbotAnalyticsConfigSchema = createSelectSchema(
  projectAiChatbotAnalyticsConfigs,
);
export type ChatbotAnalyticsConfig = z.infer<
  typeof chatbotAnalyticsConfigSchema
>;

export const analyticsReviewAgentConfigSchema = createSelectSchema(
  projectAiAnalyticsReviewAgentConfigs,
).extend({
  provider: aiProviderSchema,
  provider_config: aiProviderConfigSchema,
});
export type AnalyticsReviewAgentConfig = z.infer<
  typeof analyticsReviewAgentConfigSchema
>;

export const chatbotSessionSchema = createSelectSchema(
  projectAiChatbotSessions,
);
export type ChatbotSession = z.infer<typeof chatbotSessionSchema>;

export const chatbotEventSchema = createSelectSchema(projectAiChatbotEvents);
export type ChatbotEvent = z.infer<typeof chatbotEventSchema>;

export const chatbotTopicRuleSetSchema = createSelectSchema(
  projectAiChatbotTopicRuleSets,
);
export type ChatbotTopicRuleSet = z.infer<typeof chatbotTopicRuleSetSchema>;

export const chatbotTopicRuleSchema = createSelectSchema(
  projectAiChatbotTopicRules,
);
export type ChatbotTopicRule = z.infer<typeof chatbotTopicRuleSchema>;

export const chatbotUnmatchedReviewSchema = createSelectSchema(
  projectAiChatbotUnmatchedReviews,
);
export type ChatbotUnmatchedReview = z.infer<
  typeof chatbotUnmatchedReviewSchema
>;

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

export const chatbotAnalyticsOverviewSchema = z.object({
  chatbot_id: z.string().uuid(),
  session_count: z.number().int(),
  request_count: z.number().int(),
  avg_duration_seconds: z.number(),
  avg_turns_per_session: z.number(),
  success_rate: z.number(),
  total_tokens: z.number().int(),
  unmatched_rate: z.number(),
});
export type ChatbotAnalyticsOverview = z.infer<
  typeof chatbotAnalyticsOverviewSchema
>;

export const chatbotTimeseriesPointSchema = z.object({
  date: z.string(),
  sessions: z.number().int(),
  requests: z.number().int(),
  total_tokens: z.number().int(),
  rate_limited: z.number().int(),
  topic_counts: z.record(z.string(), z.number().int()),
});
export type ChatbotTimeseriesPoint = z.infer<
  typeof chatbotTimeseriesPointSchema
>;

export const chatbotBreakdownItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int(),
  percentage: z.number(),
});
export type ChatbotBreakdownItem = z.infer<typeof chatbotBreakdownItemSchema>;

export const chatbotRecentSessionSchema = z.object({
  id: z.string().uuid(),
  started_at: z.string(),
  last_activity_at: z.string(),
  duration_seconds: z.number().int(),
  request_count: z.number().int(),
  user_message_count: z.number().int(),
  total_tokens: z.number().int(),
  detected_language: z.string().nullable(),
  topic_tags: z.array(z.string()),
  intent_tags: z.array(z.string()),
  sentiment: z.string(),
  resolution_state: z.string(),
  classification_source: z.string(),
});
export type ChatbotRecentSession = z.infer<typeof chatbotRecentSessionSchema>;

export const chatbotQueueHealthSchema = z.object({
  pending: z.number().int(),
  failed: z.number().int(),
  classified_last_24h: z.number().int(),
  expiring_soon: z.number().int(),
  historical_eligible_unmatched: z.number().int(),
  awaiting_second_message: z.number().int(),
});
export type ChatbotQueueHealth = z.infer<typeof chatbotQueueHealthSchema>;

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

export const chatbotAnalyticsConfigInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  chatbot_id: z.string().uuid(),
  llm_fallback_enabled: z.boolean().default(false),
  review_min_confidence: z.number().int().min(0).max(100).default(60),
});
export type ChatbotAnalyticsConfigInput = z.infer<
  typeof chatbotAnalyticsConfigInputSchema
>;

export const analyticsReviewAgentConfigInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  provider: aiProviderSchema,
  project_endpoint: z.string().url().optional().nullable().or(z.literal('')),
  provider_agent_id: z.string().optional().nullable(),
  enabled: z.boolean().default(false),
  taxonomy_version: z.string().min(1).default('v1'),
  max_batch_size: z.number().int().min(1).max(100).default(20),
});
export type AnalyticsReviewAgentConfigInput = z.infer<
  typeof analyticsReviewAgentConfigInputSchema
>;

export const chatbotTopicRuleSetInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  chatbot_id: z.string().uuid(),
  enabled: z.boolean().default(false),
  default_language: z.string().min(2).max(12).default('en'),
  minimum_confidence: z.number().int().min(0).max(100).default(60),
});
export type ChatbotTopicRuleSetInput = z.infer<
  typeof chatbotTopicRuleSetInputSchema
>;

export const chatbotTopicRuleInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  chatbot_id: z.string().uuid(),
  rule_set_id: z.string().uuid(),
  topic_key: z.string().min(1),
  label: z.string().min(1),
  language: z.string().min(2).max(12).default('en'),
  keywords: z.array(z.string().min(1)).default([]),
  negative_keywords: z.array(z.string().min(1)).default([]),
  priority: z.number().int().min(1).max(10000).default(100),
  enabled: z.boolean().default(true),
});
export type ChatbotTopicRuleInput = z.infer<typeof chatbotTopicRuleInputSchema>;

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
  api_url: catalogueApiSlugSchema.optional().nullable().or(z.literal('')),
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
export const contentAdvisorIssueStatusSchema = z.enum(
  CONTENT_ADVISOR_ISSUE_STATUSES,
);
export type ContentAdvisorIssueStatus = z.infer<
  typeof contentAdvisorIssueStatusSchema
>;

export const contentAdvisorAgentConfigSchema = createSelectSchema(
  projectAiContentAdvisorAgentConfigs,
).extend({
  key: contentAdvisorAgentKeySchema,
  provider: aiProviderSchema,
  provider_config: z.record(z.string(), z.unknown()).default({}),
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
  enabled: z.boolean().default(true),
});
export type ContentAdvisorAgentConfigInput = z.infer<
  typeof contentAdvisorAgentConfigInputSchema
>;

export const brokenLinkAgentConfigInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  key: z.literal('broken-link'),
  name: z.string().min(2),
  description: z.string(),
  allowed_domain: z
    .string()
    .trim()
    .min(1, 'Domain is required')
    .refine(
      (v) =>
        /^https?:\/\//i.test(v) ||
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
          v,
        ),
      'Enter a hostname (e.g. example.com) or an origin (e.g. https://example.com)',
    ),
  crawl_depth: z.number().int().min(1).max(10).default(1),
  enabled: z.boolean().default(true),
});
export type BrokenLinkAgentConfigInput = z.infer<
  typeof brokenLinkAgentConfigInputSchema
>;

export const contentAdvisorPageReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      /^https?:\/\//i.test(value) ||
      value.startsWith('/') ||
      !value.includes(' '),
    'Use an absolute URL or an AEM-style page path.',
  );

export const contentAdvisorScheduleSchema = createSelectSchema(
  projectAiContentAdvisorSchedules,
).extend({
  pages: z.array(contentAdvisorPageReferenceSchema).default([]),
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
  enabled: z.boolean().default(true),
  pages: z.array(contentAdvisorPageReferenceSchema).min(1),
});
export type ContentAdvisorScheduleInput = z.infer<
  typeof contentAdvisorScheduleInputSchema
>;

export const contentAdvisorRunSchema = createSelectSchema(
  projectAiContentAdvisorRuns,
).extend({
  triggered_by: z.enum(['schedule', 'manual']),
});
export type ContentAdvisorRun = z.infer<typeof contentAdvisorRunSchema>;

export const contentAdvisorAgentRunSchema = createSelectSchema(
  projectAiContentAdvisorAgentRuns,
);
export type ContentAdvisorAgentRun = z.infer<
  typeof contentAdvisorAgentRunSchema
>;

export const contentAdvisorAgentRunWithAgentSchema =
  contentAdvisorAgentRunSchema.extend({
    agent: contentAdvisorAgentConfigSchema.pick({
      id: true,
      key: true,
      name: true,
      description: true,
    }),
  });
export type ContentAdvisorAgentRunWithAgent = z.infer<
  typeof contentAdvisorAgentRunWithAgentSchema
>;

export const contentAdvisorIssueSchema = createSelectSchema(
  projectAiContentAdvisorIssues,
).extend({
  issue_type: contentAdvisorIssueTypeSchema,
  severity: contentAdvisorSeveritySchema,
  status: contentAdvisorIssueStatusSchema,
});
export type ContentAdvisorIssue = z.infer<typeof contentAdvisorIssueSchema>;

export const contentAdvisorIssueCommentSchema = createSelectSchema(
  projectAiContentAdvisorIssueComments,
);
export type ContentAdvisorIssueComment = z.infer<
  typeof contentAdvisorIssueCommentSchema
>;

export const contentAdvisorIssueWithCommentsSchema =
  contentAdvisorIssueSchema.extend({
    comments: z.array(contentAdvisorIssueCommentSchema).default([]),
  });
export type ContentAdvisorIssueWithComments = z.infer<
  typeof contentAdvisorIssueWithCommentsSchema
>;

export const contentAdvisorIssueDetectionSchema = createSelectSchema(
  projectAiContentAdvisorIssueDetections,
).extend({
  run: contentAdvisorRunSchema.pick({
    id: true,
    summary: true,
    created_at: true,
    completed_at: true,
  }),
  agentRun: contentAdvisorAgentRunWithAgentSchema.pick({
    id: true,
    summary: true,
    status: true,
    created_at: true,
    agent: true,
  }),
});
export type ContentAdvisorIssueDetection = z.infer<
  typeof contentAdvisorIssueDetectionSchema
>;

export const contentAdvisorIssueDashboardItemSchema =
  contentAdvisorIssueWithCommentsSchema.extend({
    agent: contentAdvisorAgentConfigSchema.pick({
      id: true,
      key: true,
      name: true,
      description: true,
    }),
    detections: z.array(contentAdvisorIssueDetectionSchema).default([]),
    is_detected_in_latest_run: z.boolean().default(false),
  });
export type ContentAdvisorIssueDashboardItem = z.infer<
  typeof contentAdvisorIssueDashboardItemSchema
>;

export const contentAdvisorIssueCommentInputSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});
export type ContentAdvisorIssueCommentInput = z.infer<
  typeof contentAdvisorIssueCommentInputSchema
>;

export const contentAdvisorIssueStatusInputSchema = z.object({
  issue_id: z.string().uuid(),
  status: contentAdvisorIssueStatusSchema,
});
export type ContentAdvisorIssueStatusInput = z.infer<
  typeof contentAdvisorIssueStatusInputSchema
>;

export const contentAdvisorIssueInputSchema = z.object({
  page_url: contentAdvisorPageReferenceSchema,
  page_path: z.string().min(1).optional().nullable(),
  component_path: z.string().min(1).optional().nullable(),
  page_title: z.string().optional().nullable(),
  fingerprint: z.string().min(1).optional(),
  issue_type: contentAdvisorIssueTypeSchema,
  severity: contentAdvisorSeveritySchema,
  status: contentAdvisorIssueStatusSchema.default('open').optional(),
  title: z.string().min(2),
  description: z.string().min(1),
  suggestion: z.string().min(1),
  reasoning: z.string().min(1),
});
export type ContentAdvisorIssueInput = z.infer<
  typeof contentAdvisorIssueInputSchema
>;

export const contentAdvisorRunHistoryItemSchema =
  contentAdvisorRunSchema.extend({
    agentRuns: z.array(
      contentAdvisorAgentRunWithAgentSchema.pick({
        id: true,
        status: true,
        summary: true,
        issue_count: true,
        created_at: true,
        agent: true,
      }),
    ),
    issue_count: z.number().int(),
  });
export type ContentAdvisorRunHistoryItem = z.infer<
  typeof contentAdvisorRunHistoryItemSchema
>;

export const contentAdvisorSettingsSchema = createSelectSchema(
  projectAiContentAdvisorSettings,
).extend({
  auto_resolve_after_runs: z.number().int().positive().nullable(),
});
export type ContentAdvisorSettings = z.infer<
  typeof contentAdvisorSettingsSchema
>;

export const contentAdvisorSettingsInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  auto_resolve_after_runs: z.number().int().positive().nullable(),
});
export type ContentAdvisorSettingsInput = z.infer<
  typeof contentAdvisorSettingsInputSchema
>;

// ---------------------------------------------------------------------------
// AEM path → frontend URL mappings
// ---------------------------------------------------------------------------

export const pageUrlMappingSchema = createSelectSchema(
  projectAiPageUrlMappings,
);
export type PageUrlMapping = z.infer<typeof pageUrlMappingSchema>;

export const pageUrlMappingInputSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  environment_id: z.string().uuid(),
  /** AEM content path, e.g. /content/project_a/homepage */
  aem_path: z
    .string()
    .trim()
    .min(1, 'AEM path is required')
    .startsWith('/', 'AEM path must start with /'),
  /** Resolved public frontend URL, e.g. https://www.mywebsite.com/en/homepage */
  frontend_url: z
    .string()
    .trim()
    .min(1, 'Frontend URL is required')
    .url('Enter a valid URL, e.g. https://www.mywebsite.com/en/homepage'),
});
export type PageUrlMappingInput = z.infer<typeof pageUrlMappingInputSchema>;
