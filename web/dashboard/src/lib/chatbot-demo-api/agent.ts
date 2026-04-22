import type { Chatbot } from '@/data/ai/dto';
import type { ChatbotDemoRequest } from './route-handler';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';

export interface ChatbotDemoResponse {
  reply: string;
  conversationId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function chatWithChatbotAgent(
  chatbot: Chatbot,
  request: ChatbotDemoRequest,
): Promise<ChatbotDemoResponse> {
  switch (chatbot.provider) {
    case 'microsoft-foundry':
      return callFoundryChat({
        providerConfig: chatbot.provider_config,
        messages: request.messages,
        conversationId: request.conversationId,
        loggerContext: {
          route: 'chatbot-messages',
          chatbotSlug: chatbot.slug,
        },
      });
    default:
      throw new Error(`Unsupported chatbot provider: ${chatbot.provider}`);
  }
}
