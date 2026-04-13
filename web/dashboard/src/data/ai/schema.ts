import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects, environments } from '@/data/projects/schema';
import { users } from '@/data/users/schema';
import { sql } from 'drizzle-orm';

export const projectAiFeatureFlags = pgTable(
  'project_ai_feature_flag',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_feature_flag_project_key_idx').on(
      table.project_id,
      table.key,
    ),
  ],
);

export const projectAiEnvironmentFeatureFlags = pgTable(
  'project_ai_environment_feature_flag',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_env_feature_flag_env_key_idx').on(
      table.environment_id,
      table.key,
    ),
    index('project_ai_env_feature_flag_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiChatbots = pgTable(
  'project_ai_chatbot',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    public_slug: text('public_slug').notNull(),
    provider: text('provider').notNull().default('microsoft-foundry'),
    provider_config: jsonb('provider_config')
      .notNull()
      .default(sql`'{}'::jsonb`),
    project_endpoint: text('project_endpoint').notNull(),
    agent_id: text('agent_id').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_chatbot_env_slug_idx').on(
      table.environment_id,
      table.slug,
    ),
    uniqueIndex('project_ai_chatbot_public_slug_idx').on(table.public_slug),
    index('project_ai_chatbot_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiChatbotApiSettings = pgTable(
  'project_ai_chatbot_api_setting',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    rate_limit_enabled: boolean('rate_limit_enabled').notNull().default(true),
    rate_limit_max_requests: integer('rate_limit_max_requests')
      .notNull()
      .default(30),
    rate_limit_window_seconds: integer('rate_limit_window_seconds')
      .notNull()
      .default(60),
    rate_limit_use_ip: boolean('rate_limit_use_ip').notNull().default(true),
    rate_limit_use_session_cookie: boolean('rate_limit_use_session_cookie')
      .notNull()
      .default(true),
    rate_limit_use_fingerprint: boolean('rate_limit_use_fingerprint')
      .notNull()
      .default(false),
    fingerprint_header_name: text('fingerprint_header_name')
      .notNull()
      .default('x-client-fingerprint'),
    message_size_limit_enabled: boolean('message_size_limit_enabled')
      .notNull()
      .default(true),
    max_message_characters: integer('max_message_characters')
      .notNull()
      .default(8000),
    max_request_body_bytes: integer('max_request_body_bytes')
      .notNull()
      .default(16000),
    session_request_cap_enabled: boolean('session_request_cap_enabled')
      .notNull()
      .default(false),
    session_request_cap_max_requests: integer(
      'session_request_cap_max_requests',
    )
      .notNull()
      .default(200),
    session_request_cap_window_seconds: integer(
      'session_request_cap_window_seconds',
    )
      .notNull()
      .default(86400),
    ip_daily_token_budget_enabled: boolean('ip_daily_token_budget_enabled')
      .notNull()
      .default(false),
    ip_daily_token_budget: integer('ip_daily_token_budget')
      .notNull()
      .default(100000),
    temporary_block_enabled: boolean('temporary_block_enabled')
      .notNull()
      .default(true),
    temporary_block_violation_threshold: integer(
      'temporary_block_violation_threshold',
    )
      .notNull()
      .default(5),
    temporary_block_window_seconds: integer('temporary_block_window_seconds')
      .notNull()
      .default(3600),
    temporary_block_duration_seconds: integer(
      'temporary_block_duration_seconds',
    )
      .notNull()
      .default(1800),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_chatbot_api_setting_chatbot_idx').on(
      table.chatbot_id,
    ),
    index('project_ai_chatbot_api_setting_project_env_chatbot_idx').on(
      table.project_id,
      table.environment_id,
      table.chatbot_id,
    ),
  ],
);

export const projectAiChatbotStats = pgTable(
  'project_ai_chatbot_stat',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    request_count: integer('request_count').notNull().default(0),
    success_count: integer('success_count').notNull().default(0),
    error_count: integer('error_count').notNull().default(0),
    rate_limited_count: integer('rate_limited_count').notNull().default(0),
    total_input_tokens: integer('total_input_tokens').notNull().default(0),
    total_output_tokens: integer('total_output_tokens').notNull().default(0),
    total_tokens: integer('total_tokens').notNull().default(0),
    total_latency_ms: integer('total_latency_ms').notNull().default(0),
    last_request_at: timestamp('last_request_at', { withTimezone: true }),
    last_success_at: timestamp('last_success_at', { withTimezone: true }),
    last_error_at: timestamp('last_error_at', { withTimezone: true }),
    last_rate_limited_at: timestamp('last_rate_limited_at', {
      withTimezone: true,
    }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_chatbot_stat_chatbot_idx').on(table.chatbot_id),
    index('project_ai_chatbot_stat_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiChatbotAnalyticsConfigs = pgTable(
  'project_ai_chatbot_analytics_config',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    llm_fallback_enabled: boolean('llm_fallback_enabled')
      .notNull()
      .default(false),
    review_min_confidence: integer('review_min_confidence')
      .notNull()
      .default(60),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_chatbot_analytics_config_chatbot_idx').on(
      table.chatbot_id,
    ),
    index('project_ai_chatbot_analytics_config_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiAnalyticsReviewAgentConfigs = pgTable(
  'project_ai_analytics_review_agent_config',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('microsoft-foundry'),
    provider_config: jsonb('provider_config')
      .notNull()
      .default(sql`'{}'::jsonb`),
    enabled: boolean('enabled').notNull().default(false),
    taxonomy_version: text('taxonomy_version').notNull().default('v1'),
    max_batch_size: integer('max_batch_size').notNull().default(20),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_analytics_review_agent_env_idx').on(
      table.environment_id,
    ),
    index('project_ai_analytics_review_agent_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiChatbotTopicRuleSets = pgTable(
  'project_ai_chatbot_topic_rule_set',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    default_language: text('default_language').notNull().default('en'),
    minimum_confidence: integer('minimum_confidence').notNull().default(60),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_chatbot_topic_rule_set_chatbot_idx').on(
      table.chatbot_id,
    ),
    index('project_ai_chatbot_topic_rule_set_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiChatbotTopicRules = pgTable(
  'project_ai_chatbot_topic_rule',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    rule_set_id: uuid('rule_set_id')
      .notNull()
      .references(() => projectAiChatbotTopicRuleSets.id, {
        onDelete: 'cascade',
      }),
    topic_key: text('topic_key').notNull(),
    label: text('label').notNull(),
    language: text('language').notNull().default('en'),
    keywords: jsonb('keywords')
      .notNull()
      .default(sql`'[]'::jsonb`),
    negative_keywords: jsonb('negative_keywords')
      .notNull()
      .default(sql`'[]'::jsonb`),
    priority: integer('priority').notNull().default(100),
    enabled: boolean('enabled').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_chatbot_topic_rule_chatbot_lang_idx').on(
      table.chatbot_id,
      table.language,
    ),
    index('project_ai_chatbot_topic_rule_rule_set_idx').on(table.rule_set_id),
  ],
);

export const projectAiChatbotSessions = pgTable(
  'project_ai_chatbot_session',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    conversation_id: text('conversation_id'),
    session_key: text('session_key').notNull(),
    identity_source: text('identity_source').notNull(),
    started_at: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    last_activity_at: timestamp('last_activity_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ended_at: timestamp('ended_at', { withTimezone: true }),
    duration_seconds: integer('duration_seconds').notNull().default(0),
    request_count: integer('request_count').notNull().default(0),
    user_message_count: integer('user_message_count').notNull().default(0),
    assistant_message_count: integer('assistant_message_count')
      .notNull()
      .default(0),
    error_count: integer('error_count').notNull().default(0),
    rate_limited_count: integer('rate_limited_count').notNull().default(0),
    total_input_tokens: integer('total_input_tokens').notNull().default(0),
    total_output_tokens: integer('total_output_tokens').notNull().default(0),
    total_tokens: integer('total_tokens').notNull().default(0),
    total_latency_ms: integer('total_latency_ms').notNull().default(0),
    detected_language: text('detected_language'),
    is_multilingual: boolean('is_multilingual').notNull().default(false),
    intent_tags: jsonb('intent_tags')
      .notNull()
      .default(sql`'[]'::jsonb`),
    topic_tags: jsonb('topic_tags')
      .notNull()
      .default(sql`'[]'::jsonb`),
    sentiment: text('sentiment').notNull().default('unknown'),
    resolution_state: text('resolution_state').notNull().default('unknown'),
    classification_source: text('classification_source')
      .notNull()
      .default('rules'),
    classification_confidence: integer('classification_confidence')
      .notNull()
      .default(0),
    first_user_message_at: timestamp('first_user_message_at', {
      withTimezone: true,
    }),
    second_user_message_at: timestamp('second_user_message_at', {
      withTimezone: true,
    }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_chatbot_session_chatbot_started_idx').on(
      table.chatbot_id,
      table.started_at,
    ),
    index('project_ai_chatbot_session_env_started_idx').on(
      table.environment_id,
      table.started_at,
    ),
    index('project_ai_chatbot_session_chatbot_key_idx').on(
      table.chatbot_id,
      table.session_key,
    ),
  ],
);

export const projectAiChatbotEvents = pgTable(
  'project_ai_chatbot_event',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    session_id: uuid('session_id')
      .notNull()
      .references(() => projectAiChatbotSessions.id, { onDelete: 'cascade' }),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    status_code: integer('status_code'),
    latency_ms: integer('latency_ms'),
    request_body_bytes: integer('request_body_bytes'),
    message_count: integer('message_count'),
    latest_user_characters: integer('latest_user_characters'),
    input_tokens: integer('input_tokens').notNull().default(0),
    output_tokens: integer('output_tokens').notNull().default(0),
    total_tokens: integer('total_tokens').notNull().default(0),
    success: boolean('success').notNull().default(false),
    rate_limited: boolean('rate_limited').notNull().default(false),
    temporary_blocked: boolean('temporary_blocked').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_chatbot_event_session_created_idx').on(
      table.session_id,
      table.created_at,
    ),
    index('project_ai_chatbot_event_chatbot_created_idx').on(
      table.chatbot_id,
      table.created_at,
    ),
  ],
);

export const projectAiChatbotUnmatchedReviews = pgTable(
  'project_ai_chatbot_unmatched_review',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    chatbot_id: uuid('chatbot_id')
      .notNull()
      .references(() => projectAiChatbots.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id')
      .notNull()
      .references(() => projectAiChatbotSessions.id, { onDelete: 'cascade' }),
    event_id: uuid('event_id').references(() => projectAiChatbotEvents.id, {
      onDelete: 'set null',
    }),
    detected_language: text('detected_language'),
    first_user_message: text('first_user_message').notNull(),
    second_user_message: text('second_user_message'),
    assistant_excerpt: text('assistant_excerpt'),
    match_failure_reason: text('match_failure_reason').notNull(),
    status: text('status').notNull().default('pending'),
    review_attempts: integer('review_attempts').notNull().default(0),
    classification_source: text('classification_source'),
    classification_confidence: integer('classification_confidence'),
    last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
    classified_at: timestamp('classified_at', { withTimezone: true }),
    error_message: text('error_message'),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_chatbot_unmatched_review_status_exp_idx').on(
      table.status,
      table.expires_at,
    ),
    index('project_ai_chatbot_unmatched_review_chatbot_created_idx').on(
      table.chatbot_id,
      table.created_at,
    ),
  ],
);

export const projectAiCatalogues = pgTable(
  'project_ai_catalogue',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    provider: text('provider').notNull().default('microsoft-foundry'),
    provider_config: jsonb('provider_config')
      .notNull()
      .default(sql`'{}'::jsonb`),
    system_prompt: text('system_prompt').notNull().default(''),
    agent_id: text('agent_id'),
    api_url: text('api_url'),
    agent_principal_id: text('agent_principal_id'),
    tenant_id: text('tenant_id'),
    activity_protocol_endpoint: text('activity_protocol_endpoint'),
    responses_api_endpoint: text('responses_api_endpoint'),
    show_in_sidebar: boolean('show_in_sidebar').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_catalogue_env_slug_idx').on(
      table.environment_id,
      table.slug,
    ),
    uniqueIndex('project_ai_catalogue_api_url_idx').on(table.api_url),
    index('project_ai_catalogue_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiCatalogueVersions = pgTable(
  'project_ai_catalogue_version',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    catalogue_id: uuid('catalogue_id')
      .notNull()
      .references(() => projectAiCatalogues.id, { onDelete: 'cascade' }),
    data: jsonb('data')
      .notNull()
      .default(sql`'{"items":[],"facets":{}}'::jsonb`),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_catalogue_version_catalogue_idx').on(table.catalogue_id),
    index('project_ai_catalogue_version_created_idx').on(table.created_at),
  ],
);

export const projectAiAuthorDialogs = pgTable(
  'project_ai_author_dialog',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    public_slug: text('public_slug').notNull(),
    provider: text('provider').notNull().default('microsoft-foundry'),
    provider_config: jsonb('provider_config')
      .notNull()
      .default(sql`'{}'::jsonb`),
    system_prompt: text('system_prompt').notNull().default(''),
    enabled: boolean('enabled').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_author_dialog_env_slug_idx').on(
      table.environment_id,
      table.slug,
    ),
    uniqueIndex('project_ai_author_dialog_public_slug_idx').on(
      table.public_slug,
    ),
    index('project_ai_author_dialog_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiContentAdvisorAgentConfigs = pgTable(
  'project_ai_content_advisor_agent_config',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    provider: text('provider').notNull().default('microsoft-foundry'),
    provider_config: jsonb('provider_config')
      .notNull()
      .default(sql`'{}'::jsonb`),
    prompt: text('prompt').notNull().default(''),
    enabled: boolean('enabled').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_content_advisor_agent_env_key_idx').on(
      table.environment_id,
      table.key,
    ),
    index('project_ai_content_advisor_agent_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiContentAdvisorSchedules = pgTable(
  'project_ai_content_advisor_schedule',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    cron: text('cron').notNull().default('0 * * * *'),
    focus_instruction: text('focus_instruction'),
    enabled: boolean('enabled').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_schedule_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

export const projectAiContentAdvisorSchedulePages = pgTable(
  'project_ai_content_advisor_schedule_page',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    schedule_id: uuid('schedule_id')
      .notNull()
      .references(() => projectAiContentAdvisorSchedules.id, {
        onDelete: 'cascade',
      }),
    url: text('url').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_schedule_page_idx').on(table.schedule_id),
  ],
);

export const projectAiContentAdvisorRuns = pgTable(
  'project_ai_content_advisor_run',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    schedule_id: uuid('schedule_id').references(
      () => projectAiContentAdvisorSchedules.id,
      { onDelete: 'set null' },
    ),
    triggered_by: text('triggered_by').notNull().default('schedule'),
    status: text('status').notNull().default('completed'),
    summary: text('summary').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completed_at: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_run_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
    index('project_ai_content_advisor_run_created_idx').on(table.created_at),
  ],
);

export const projectAiContentAdvisorAgentRuns = pgTable(
  'project_ai_content_advisor_agent_run',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    run_id: uuid('run_id')
      .notNull()
      .references(() => projectAiContentAdvisorRuns.id, {
        onDelete: 'cascade',
      }),
    agent_config_id: uuid('agent_config_id').references(
      () => projectAiContentAdvisorAgentConfigs.id,
      {
        onDelete: 'set null',
      },
    ),
    status: text('status').notNull().default('completed'),
    summary: text('summary').notNull().default(''),
    response: text('response').notNull().default(''),
    issue_count: integer('issue_count').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_agent_run_run_idx').on(table.run_id),
    index('project_ai_content_advisor_agent_run_agent_idx').on(
      table.agent_config_id,
    ),
  ],
);

export const projectAiContentAdvisorIssues = pgTable(
  'project_ai_content_advisor_issue',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, {
        onDelete: 'cascade',
      }),
    run_id: uuid('run_id')
      .notNull()
      .references(() => projectAiContentAdvisorRuns.id, {
        onDelete: 'cascade',
      }),
    agent_run_id: uuid('agent_run_id')
      .notNull()
      .references(() => projectAiContentAdvisorAgentRuns.id, {
        onDelete: 'cascade',
      }),
    page_url: text('page_url').notNull(),
    page_path: text('page_path'),
    component_path: text('component_path'),
    fingerprint: text('fingerprint').notNull(),
    page_title: text('page_title'),
    issue_type: text('issue_type').notNull(),
    severity: text('severity').notNull().default('info'),
    status: text('status').notNull().default('open'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    suggestion: text('suggestion').notNull().default(''),
    reasoning: text('reasoning').notNull().default(''),
    first_detected_at: timestamp('first_detected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    last_detected_at: timestamp('last_detected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    detection_count: integer('detection_count').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_issue_environment_idx').on(
      table.environment_id,
    ),
    index('project_ai_content_advisor_issue_run_idx').on(table.run_id),
    index('project_ai_content_advisor_issue_agent_run_idx').on(
      table.agent_run_id,
    ),
    index('project_ai_content_advisor_issue_type_idx').on(table.issue_type),
    index('project_ai_content_advisor_issue_env_status_idx').on(
      table.environment_id,
      table.status,
    ),
    uniqueIndex('project_ai_content_advisor_issue_fingerprint_idx').on(
      table.environment_id,
      table.fingerprint,
    ),
  ],
);

export const projectAiContentAdvisorIssueComments = pgTable(
  'project_ai_content_advisor_issue_comment',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    issue_id: uuid('issue_id')
      .notNull()
      .references(() => projectAiContentAdvisorIssues.id, {
        onDelete: 'cascade',
      }),
    author_user_id: uuid('author_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    author_name: text('author_name').notNull(),
    author_email: text('author_email'),
    author_image: text('author_image'),
    body: text('body').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_issue_comment_issue_idx').on(
      table.issue_id,
    ),
    index('project_ai_content_advisor_issue_comment_author_idx').on(
      table.author_user_id,
    ),
  ],
);

export const projectAiContentAdvisorIssueDetections = pgTable(
  'project_ai_content_advisor_issue_detection',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    issue_id: uuid('issue_id')
      .notNull()
      .references(() => projectAiContentAdvisorIssues.id, {
        onDelete: 'cascade',
      }),
    run_id: uuid('run_id')
      .notNull()
      .references(() => projectAiContentAdvisorRuns.id, {
        onDelete: 'cascade',
      }),
    agent_run_id: uuid('agent_run_id')
      .notNull()
      .references(() => projectAiContentAdvisorAgentRuns.id, {
        onDelete: 'cascade',
      }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_issue_detection_issue_idx').on(
      table.issue_id,
    ),
    index('project_ai_content_advisor_issue_detection_run_idx').on(
      table.run_id,
    ),
    index('project_ai_content_advisor_issue_detection_agent_run_idx').on(
      table.agent_run_id,
    ),
  ],
);

export const projectAiContentAdvisorSettings = pgTable(
  'project_ai_content_advisor_settings',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    auto_resolve_after_runs: integer('auto_resolve_after_runs'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_ai_content_advisor_settings_project_idx').on(
      table.project_id,
    ),
    index('project_ai_content_advisor_settings_environment_idx').on(
      table.environment_id,
    ),
    uniqueIndex('project_ai_content_advisor_settings_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

/**
 * Maps an AEM-style page path (e.g. /content/project_a/homepage) to a
 * frontend URL (e.g. https://www.mywebsite.com/en/homepage) for a given
 * project + environment combination.
 *
 * Used by the broken-link crawler to resolve AEM paths to crawlable URLs
 * before starting the crawl.
 */
export const projectAiPageUrlMappings = pgTable(
  'project_ai_page_url_mapping',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    /** AEM path, e.g. /content/project_a/homepage */
    aem_path: text('aem_path').notNull(),
    /** Resolved frontend URL, e.g. https://www.mywebsite.com/en/homepage */
    frontend_url: text('frontend_url').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_ai_page_url_mapping_env_path_idx').on(
      table.environment_id,
      table.aem_path,
    ),
    index('project_ai_page_url_mapping_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);
