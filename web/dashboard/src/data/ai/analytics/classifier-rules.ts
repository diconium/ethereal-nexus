import type { ChatbotTopicRule } from '@/data/ai/dto';

export type RuleClassification = {
  matched: boolean;
  detectedLanguage: string;
  topicTags: string[];
  intentTags: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'unknown';
  resolutionState:
    | 'resolved'
    | 'unresolved'
    | 'handoff-needed'
    | 'abandoned'
    | 'unknown';
  confidence: number;
  source: 'rules';
  reason: string;
};

const GREETING_KEYWORDS = [
  'hello',
  'hi',
  'hey',
  'good morning',
  'good afternoon',
];
const FRUSTRATION_KEYWORDS = [
  'not working',
  'broken',
  'frustrated',
  'angry',
  'error',
  'issue',
];
const RESOLVED_KEYWORDS = [
  'thanks',
  'thank you',
  'solved',
  'that worked',
  'perfect',
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function detectLanguage(...inputs: Array<string | null | undefined>) {
  const text = inputs.filter(Boolean).join(' ').toLowerCase();
  if (/(\b(hola|precio|devoluci[oó]n|env[ií]o)\b)/.test(text)) {
    return 'es';
  }
  if (/(\b(hallo|preis|r[üu]ckgabe|versand)\b)/.test(text)) {
    return 'de';
  }
  if (/(\b(bonjour|prix|retour|livraison)\b)/.test(text)) {
    return 'fr';
  }
  return 'en';
}

function inferIntent(text: string): string[] {
  const normalized = normalize(text);
  if (GREETING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return ['general-chat'];
  }
  if (/(help|support|assist)/.test(normalized)) {
    return ['support'];
  }
  if (/(error|broken|not working|failed|issue)/.test(normalized)) {
    return ['troubleshooting'];
  }
  if (/(price|plan|cost|recommend|find|show me)/.test(normalized)) {
    return ['product-discovery'];
  }
  if (/(how do i|can i|what is|where is)/.test(normalized)) {
    return ['faq'];
  }
  return [];
}

function inferSentiment(text: string): RuleClassification['sentiment'] {
  const normalized = normalize(text);
  if (FRUSTRATION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'frustrated';
  }
  if (/(great|awesome|perfect|thanks|thank you)/.test(normalized)) {
    return 'positive';
  }
  return 'neutral';
}

function inferResolutionState(
  text: string,
): RuleClassification['resolutionState'] {
  const normalized = normalize(text);
  if (RESOLVED_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'resolved';
  }
  return 'unknown';
}

export function classifyConversationWithRules(input: {
  firstUserMessage: string;
  secondUserMessage?: string | null;
  assistantExcerpt?: string | null;
  rules: ChatbotTopicRule[];
  defaultLanguage?: string | null;
}): RuleClassification {
  const detectedLanguage =
    detectLanguage(
      input.firstUserMessage,
      input.secondUserMessage,
      input.assistantExcerpt,
    ) ||
    input.defaultLanguage ||
    'en';
  const combined = [
    input.firstUserMessage,
    input.secondUserMessage || '',
    input.assistantExcerpt || '',
  ]
    .join(' ')
    .toLowerCase();

  const matchingRules = input.rules
    .filter((rule) => rule.enabled)
    .filter(
      (rule) => rule.language === detectedLanguage || rule.language === 'all',
    )
    .filter((rule) => {
      const keywords = Array.isArray(rule.keywords) ? rule.keywords : [];
      const negativeKeywords = Array.isArray(rule.negative_keywords)
        ? rule.negative_keywords
        : [];
      const hasKeyword = keywords.some((keyword) =>
        combined.includes(normalize(String(keyword))),
      );
      const hasNegative = negativeKeywords.some((keyword) =>
        combined.includes(normalize(String(keyword))),
      );
      return hasKeyword && !hasNegative;
    })
    .sort((a, b) => a.priority - b.priority);

  const topicTags = Array.from(
    new Set(matchingRules.map((rule) => rule.topic_key)),
  );
  const intentTags = inferIntent(combined);
  const confidence = topicTags.length
    ? Math.min(95, 55 + topicTags.length * 15)
    : 0;

  return {
    matched: topicTags.length > 0,
    detectedLanguage,
    topicTags,
    intentTags,
    sentiment: inferSentiment(combined),
    resolutionState: inferResolutionState(combined),
    confidence,
    source: 'rules',
    reason: topicTags.length ? 'matched-topic-rules' : 'no-topic-rule-match',
  };
}
