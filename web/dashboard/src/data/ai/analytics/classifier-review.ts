import { z } from 'zod';
import type { AnalyticsReviewAgentConfig } from '@/data/ai/dto';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';

export const reviewClassificationSchema = z.object({
  topic_tags: z.array(z.string()).default([]),
  intent_tags: z.array(z.string()).default([]),
  sentiment: z.enum([
    'positive',
    'neutral',
    'negative',
    'frustrated',
    'unknown',
  ]),
  resolution_state: z.enum([
    'resolved',
    'unresolved',
    'handoff-needed',
    'abandoned',
    'unknown',
  ]),
  confidence: z.number().min(0).max(1),
});

function parseJsonPayload(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Review agent did not return JSON.');
    }
    return JSON.parse(match[0]);
  }
}

export async function classifyChatbotConversationWithFoundry(input: {
  config: AnalyticsReviewAgentConfig;
  chatbotName: string;
  detectedLanguage?: string | null;
  firstUserMessage: string;
  secondUserMessage?: string | null;
  assistantExcerpt?: string | null;
}) {
  const prompt = [
    'Classify the conversation into the allowed taxonomy only.',
    'Return valid JSON only with keys: topic_tags, intent_tags, sentiment, resolution_state, confidence.',
    'Allowed sentiments: positive, neutral, negative, frustrated, unknown.',
    'Allowed resolution states: resolved, unresolved, handoff-needed, abandoned, unknown.',
    'Use short canonical tag keys. Avoid prose.',
    `Chatbot: ${input.chatbotName}`,
    `Detected language: ${input.detectedLanguage || 'unknown'}`,
    `First user message: ${input.firstUserMessage}`,
    `Second user message: ${input.secondUserMessage || ''}`,
    `Assistant excerpt: ${input.assistantExcerpt || ''}`,
  ].join('\n');

  const response = await callFoundryChat({
    providerConfig: input.config.provider_config,
    messages: [{ role: 'user', content: prompt }],
    loggerContext: {
      route: 'chatbot-analytics-review',
      chatbotName: input.chatbotName,
    },
  });

  const parsed = reviewClassificationSchema.safeParse(
    parseJsonPayload(response.reply),
  );
  if (!parsed.success) {
    throw new Error('Review agent returned invalid classification payload.');
  }

  return parsed.data;
}
