import { DefaultAzureCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { logger } from '@/lib/logger';
import { estimateTokenCount } from '@/lib/rate-limit';
import { getFoundryConfigOrThrow } from '@/data/ai/provider';
import type { CatalogueData } from '@/data/ai/catalogue';
import { catalogueDataSchema } from '@/data/ai/catalogue';

let credential: DefaultAzureCredential | null = null;
const FOUNDRY_REQUEST_TIMEOUT_MS = 90_000;

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
  context?: Record<string, unknown>,
) {
  return await Promise.race<T>([
    operation,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        logger.warn(message, context);
        clearTimeout(timeoutId);
        reject(new Error(message));
      }, timeoutMs);
    }),
  ]);
}

function getCredential() {
  if (!credential) {
    credential = new DefaultAzureCredential();
  }
  return credential;
}

function getClient(projectEndpoint: string) {
  return new AIProjectClient(projectEndpoint, getCredential());
}

async function getAgentDefinition(client: AIProjectClient, agentId: string) {
  const baseAgentName = agentId.split(':')[0];
  try {
    return await withTimeout(
      client.agents.get(agentId),
      FOUNDRY_REQUEST_TIMEOUT_MS,
      'Timed out while resolving Microsoft Foundry agent definition.',
      { agentId },
    );
  } catch (error) {
    if (baseAgentName !== agentId) {
      try {
        return await withTimeout(
          client.agents.get(baseAgentName),
          FOUNDRY_REQUEST_TIMEOUT_MS,
          'Timed out while resolving Microsoft Foundry base agent definition.',
          { agentId: baseAgentName },
        );
      } catch {
        // ignore
      }
    }
    throw error;
  }
}

export async function callFoundryChat(options: {
  providerConfig: unknown;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  loggerContext?: Record<string, unknown>;
}) {
  logger.info('Starting Microsoft Foundry chat request', {
    provider: 'microsoft-foundry',
    messageCount: options.messages.length,
    hasConversationId: Boolean(options.conversationId),
    ...options.loggerContext,
  });

  const config = getFoundryConfigOrThrow(options.providerConfig);
  const projectClient = getClient(config.project_endpoint);
  logger.debug('Microsoft Foundry project client created', {
    provider: 'microsoft-foundry',
    projectEndpoint: config.project_endpoint,
    ...options.loggerContext,
  });

  const agent = await getAgentDefinition(projectClient, config.agent_id);
  logger.debug('Microsoft Foundry agent definition loaded', {
    provider: 'microsoft-foundry',
    agentId: config.agent_id,
    resolvedAgentName: agent.name,
    ...options.loggerContext,
  });

  const openAIClient = await projectClient.getOpenAIClient();
  logger.debug('Microsoft Foundry OpenAI client resolved', {
    provider: 'microsoft-foundry',
    ...options.loggerContext,
  });

  const lastUserMessage = [...options.messages]
    .reverse()
    .find((message) => message.role === 'user');

  logger.info('Resolved Microsoft Foundry configuration', {
    provider: 'microsoft-foundry',
    projectEndpoint: config.project_endpoint,
    agentId: config.agent_id,
    resolvedAgentName: agent.name,
    ...options.loggerContext,
  });

  if (options.conversationId) {
    if (lastUserMessage) {
      logger.debug('Appending user message to existing Foundry conversation', {
        provider: 'microsoft-foundry',
        conversationId: options.conversationId,
        userMessageLength: lastUserMessage.content.length,
        ...options.loggerContext,
      });
      await withTimeout(
        openAIClient.conversations.items.create(options.conversationId, {
          items: [
            {
              type: 'message',
              role: 'user',
              content: lastUserMessage.content,
            },
          ],
        }),
        FOUNDRY_REQUEST_TIMEOUT_MS,
        'Timed out while appending to Microsoft Foundry conversation.',
        {
          conversationId: options.conversationId,
          ...options.loggerContext,
        },
      );
    }

    logger.info('Creating Foundry response for existing conversation', {
      provider: 'microsoft-foundry',
      conversationId: options.conversationId,
      resolvedAgentName: agent.name,
      ...options.loggerContext,
    });
    const response = await withTimeout(
      openAIClient.responses.create(
        { conversation: options.conversationId },
        {
          body: {
            agent: { name: agent.name, type: 'agent_reference' },
          },
        },
      ),
      FOUNDRY_REQUEST_TIMEOUT_MS,
      'Timed out while waiting for Microsoft Foundry response.',
      {
        conversationId: options.conversationId,
        ...options.loggerContext,
      },
    );

    logger.info('Received Foundry response for existing conversation', {
      provider: 'microsoft-foundry',
      conversationId: options.conversationId,
      outputLength: response.output_text?.length ?? 0,
      ...options.loggerContext,
    });
    logger.debug('Foundry response message payload', {
      provider: 'microsoft-foundry',
      conversationId: options.conversationId,
      outputText: response.output_text ?? '',
      ...options.loggerContext,
    });

    return {
      reply: response.output_text ?? '',
      conversationId: options.conversationId,
      usage: {
        inputTokens:
          Number((response as any)?.usage?.input_tokens) ||
          estimateTokenCount(lastUserMessage?.content ?? ''),
        outputTokens:
          Number((response as any)?.usage?.output_tokens) ||
          estimateTokenCount(response.output_text ?? ''),
        totalTokens:
          Number((response as any)?.usage?.total_tokens) ||
          estimateTokenCount(
            `${lastUserMessage?.content ?? ''}${response.output_text ?? ''}`,
          ),
      },
    };
  }

  const items = options.messages.map((message) => ({
    type: 'message' as const,
    role: message.role,
    content: message.content,
  }));
  logger.info('Creating new Foundry conversation', {
    provider: 'microsoft-foundry',
    itemCount: items.length,
    resolvedAgentName: agent.name,
    ...options.loggerContext,
  });
  const conversation = await withTimeout(
    openAIClient.conversations.create({ items }),
    FOUNDRY_REQUEST_TIMEOUT_MS,
    'Timed out while creating Microsoft Foundry conversation.',
    options.loggerContext,
  );
  logger.debug('Created new Foundry conversation', {
    provider: 'microsoft-foundry',
    conversationId: conversation.id,
    ...options.loggerContext,
  });

  logger.info('Creating Foundry response for new conversation', {
    provider: 'microsoft-foundry',
    conversationId: conversation.id,
    resolvedAgentName: agent.name,
    ...options.loggerContext,
  });
  const response = await withTimeout(
    openAIClient.responses.create(
      { conversation: conversation.id },
      {
        body: {
          agent: { name: agent.name, type: 'agent_reference' },
        },
      },
    ),
    FOUNDRY_REQUEST_TIMEOUT_MS,
    'Timed out while waiting for Microsoft Foundry response.',
    {
      conversationId: conversation.id,
      ...options.loggerContext,
    },
  );
  logger.info('Received Foundry response for new conversation', {
    provider: 'microsoft-foundry',
    conversationId: conversation.id,
    outputLength: response.output_text?.length ?? 0,
    ...options.loggerContext,
  });
  logger.debug('Foundry response message payload', {
    provider: 'microsoft-foundry',
    conversationId: conversation.id,
    outputText: response.output_text ?? '',
    ...options.loggerContext,
  });
  const inputText = options.messages
    .map((message) => message.content)
    .join('\n');

  return {
    reply: response.output_text ?? '',
    conversationId: conversation.id,
    usage: {
      inputTokens:
        Number((response as any)?.usage?.input_tokens) ||
        estimateTokenCount(inputText),
      outputTokens:
        Number((response as any)?.usage?.output_tokens) ||
        estimateTokenCount(response.output_text ?? ''),
      totalTokens:
        Number((response as any)?.usage?.total_tokens) ||
        estimateTokenCount(`${inputText}${response.output_text ?? ''}`),
    },
  };
}

function extractJson(text: string): unknown {
  const fence = text.match(/```json[\s\S]*?```/i);
  const candidate = fence ? fence[0].replace(/```json|```/gi, '').trim() : text;
  try {
    return JSON.parse(candidate);
  } catch (err) {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw err;
  }
}

function sanitiseCatalogueData(raw: unknown): unknown {
  const coerceStr = (v: unknown) =>
    typeof v === 'string' ? v : v == null ? '' : String(v);
  const coerceArr = (v: unknown) => (Array.isArray(v) ? v : []);
  const coerceStrOrNull = (v: unknown) =>
    typeof v === 'string' ? v : v == null ? null : String(v);
  const coerceAttr = (v: unknown): string | string[] | null => {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.map((x) => coerceStr(x));
    return String(v);
  };

  const data = raw as Record<string, unknown>;
  const items = coerceArr(data?.items).map((row: unknown) => {
    const item = row as Record<string, unknown>;
    const attributes: Record<string, string | string[] | null> = {};
    const rawAttrs = item?.attributes;
    if (rawAttrs && typeof rawAttrs === 'object' && !Array.isArray(rawAttrs)) {
      for (const [key, value] of Object.entries(
        rawAttrs as Record<string, unknown>,
      )) {
        attributes[key] = coerceAttr(value);
      }
    }

    return {
      id: coerceStr(item?.id),
      name: coerceStr(item?.name),
      description: coerceStr(item?.description),
      features: coerceArr(item?.features).map(coerceStr),
      highlights: coerceArr(item?.highlights).map((highlightItem: unknown) => ({
        title: coerceStr((highlightItem as Record<string, unknown>)?.title),
        description: coerceStr(
          (highlightItem as Record<string, unknown>)?.description,
        ),
      })),
      asset_url: coerceStrOrNull(item?.asset_url),
      attributes,
    };
  });

  const facets: Record<string, { value: string; count: number }[]> = {};
  if (
    data?.facets &&
    typeof data.facets === 'object' &&
    !Array.isArray(data.facets)
  ) {
    for (const [key, arr] of Object.entries(
      data.facets as Record<string, unknown>,
    )) {
      facets[key] = coerceArr(arr).map((facet: unknown) => ({
        value: coerceStr((facet as Record<string, unknown>)?.value),
        count: Number((facet as Record<string, unknown>)?.count) || 0,
      }));
    }
  }

  return { items, facets };
}

export async function generateCatalogueWithFoundry(options: {
  providerConfig: unknown;
  systemPrompt: string;
  loggerContext?: Record<string, unknown>;
}): Promise<CatalogueData> {
  logger.info('Preparing catalogue generation prompt', {
    provider: 'microsoft-foundry',
    systemPromptLength: options.systemPrompt.length,
    ...options.loggerContext,
  });

  const schemaPrompt = JSON.stringify(
    {
      items: [
        {
          id: 'string',
          name: 'string',
          description: 'string',
          features: ['string'],
          highlights: [{ title: 'string', description: 'string' }],
          asset_url: 'string or null',
          attributes: { '<key>': 'string | string[] | null' },
        },
      ],
      facets: { '<attributeKey>': [{ value: 'string', count: 'number' }] },
    },
    null,
    2,
  );

  const response = await callFoundryChat({
    providerConfig: options.providerConfig,
    messages: [
      {
        role: 'user',
        content: [
          options.systemPrompt.trim(),
          '',
          'Return ONLY valid JSON matching this exact schema (no prose, no markdown fences):',
          '',
          schemaPrompt,
        ].join('\n'),
      },
    ],
    loggerContext: options.loggerContext,
  });

  logger.debug('Catalogue generation raw response received', {
    provider: 'microsoft-foundry',
    replyLength: response.reply.length,
    ...options.loggerContext,
  });

  const parsed = catalogueDataSchema.safeParse(
    sanitiseCatalogueData(extractJson(response.reply)),
  );

  if (!parsed.success) {
    logger.warn('Catalogue generation response failed schema validation', {
      provider: 'microsoft-foundry',
      issue: parsed.error.issues[0]?.message,
      ...options.loggerContext,
    });
    const issue = parsed.error.issues[0];
    throw new Error(
      `Agent returned invalid catalogue data at ${issue?.path?.join('.') || 'root'}: ${issue?.message}`,
    );
  }

  logger.info('Catalogue generation response parsed successfully', {
    provider: 'microsoft-foundry',
    itemCount: parsed.data.items.length,
    facetCount: Object.keys(parsed.data.facets).length,
    ...options.loggerContext,
  });

  return parsed.data;
}
