import type { Chatbot } from '@/data/ai/dto';
import type { ChatbotDemoRequest } from './route-handler';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';
import { callVertexReasoningEngineChat } from '@/lib/ai-providers/google-vertex';

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
    case 'vertex-ai-google':
      return callVertexReasoningEngineChat({
        providerConfig: chatbot.provider_config as any,
        messages: request.messages,
        conversationId: request.conversationId
      });
    default:
      throw new Error(`Unsupported chatbot provider: ${chatbot.provider}`);
  }
}
