import { v1beta1 } from '@google-cloud/aiplatform';
import {estimateTokenCount} from "@/lib/rate-limit";
import {ChatbotDemoResponse} from "@/lib/chatbot-demo-api/agent";
import {logger} from "@/lib/logger";
import {decodeHttpBody, extractTextFromPayload} from "@/utils/extractor-utils";

const REQUEST_TIMEOUT_MS = 90_000;

type SessionClient = v1beta1.SessionServiceClient;
type ExecutionClient =
  v1beta1.ReasoningEngineExecutionServiceClient;

type VertexAdapterConfig = {
  project: string;
  location: string;
  reasoningEngine: string;
};

type ChatOptions = {
  message: string;
  sessionId?: string;
};

type ChatResponse = {
  reply: string;
  sessionId: string;
};

const clientCache = new Map<
  string,
  {
    session: SessionClient;
    execution: ExecutionClient;
  }
>();

function getClients(location: string) {
  const cached = clientCache.get(location);

  if (cached) {
    return cached;
  }

  const apiEndpoint = `${location}-aiplatform.googleapis.com`;

  const clients = {
    session: new v1beta1.SessionServiceClient({
      apiEndpoint,
    }),

    execution:
      new v1beta1.ReasoningEngineExecutionServiceClient({
        apiEndpoint,
      }),
  };

  clientCache.set(location, clients);

  return clients;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,

    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Vertex request timeout'));
      }, timeoutMs);
    }),
  ]);
}

function buildEnginePath(config: VertexAdapterConfig) {
  return `projects/${config.project}/locations/${config.location}/reasoningEngines/${config.reasoningEngine}`;
}

function buildSessionId() {
  return `chat-${Date.now()}`;
}

function toVertexStruct(data: Record<string, string>) {
  return {
    fields: Object.entries(data).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          stringValue: value,
        };

        return acc;
      },
      {} as Record<string, { stringValue: string }>,
    ),
  };
}

function extractText(body: any): string {
  if (!body) {
    return '';
  }

  if (typeof body === 'string') {
    return body;
  }

  if (body.text) {
    return body.text;
  }

  return JSON.stringify(body);
}

export class VertexReasoningEngineAdapter {

  private sessionClient: SessionClient;

  private executionClient: ExecutionClient;

  private enginePath: string;

  constructor(config: VertexAdapterConfig) {
    this.config = config;

    const clients = getClients(config.location);

    this.sessionClient = clients.session;
    this.executionClient = clients.execution;

    this.enginePath = buildEnginePath(config);
  }

  async createSession(): Promise<string> {
    const sessionId = buildSessionId();

    const [operation] =
      await this.sessionClient.createSession({
        parent: this.enginePath,

        session: {
          userId: sessionId,
        },

        sessionId,
      });

    const [response] = (await withTimeout(
      operation.promise()
    )) as unknown as [{ name?: string }];

    if (!response.name) {
      throw new Error(
        'Vertex session created without name',
      );
    }

    return response.name;
  }

  async chat(
    options: ChatOptions,
  ): Promise<ChatResponse> {
    let sessionId =
      options.sessionId || (await this.createSession());

    try {
      const reply = await this.query({
        sessionId,
        message: options.message,
      });

      return {
        reply,
        sessionId,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        /does not belong to user/i.test(error.message)
      ) {
        sessionId = await this.createSession();

        const reply = await this.query({
          sessionId,
          message: options.message,
        });

        return {
          reply,
          sessionId,
        };
      }

      throw error;
    }
  }

  private extractSessionId(session: string) {
    return session.split('/').pop() || session;
  }

  private async query(options: {
    sessionId: string;
    message: string;
  }) {
    const stream =
      this.executionClient.streamQueryReasoningEngine({
        name: this.enginePath,
        classMethod: 'async_stream_query',
        input: toVertexStruct({
          message: options.message,
          session_id: this.extractSessionId(options.sessionId),
          user_id: this.extractSessionId(options.sessionId),
        }),
      });

    return withTimeout(
      this.collectStream(stream),
    );
  }


  private async collectStream(stream: any) {
    const chunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (response: any) => {
        try {
          const body = decodeHttpBody(response);

          const extracted = extractTextFromPayload(body);

          if (extracted.isError) {
            reject(new Error(extracted.text));
            return;
          }

          if (extracted.text) {
            chunks.push(extracted.text);
          }
        } catch (err) {
          reject(err);
        }
      });

      stream.on('error', reject);
      stream.on('end', resolve);
    });

    return chunks.join('').trim();
  }
}


export async function callVertexReasoningEngineChat(
  options: {
    providerConfig: {
      project: string;
      location: string;
      reasoning_engine: string;
    };

    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;

    conversationId?: string;
  },
): Promise<ChatbotDemoResponse> {
  const vertex =
    new VertexReasoningEngineAdapter({
      project:
      options.providerConfig.project,

      location:
      options.providerConfig.location,

      reasoningEngine:
      options.providerConfig.reasoning_engine,
    });

  const latestUserMessage = [...options.messages]
    .reverse()
    .find((m) => m.role === 'user');

  if (!latestUserMessage) {
    throw new Error(
      'At least one user message is required.',
    );
  }

  const chatResult = await vertex.chat({
    message: latestUserMessage.content,
    sessionId: options.conversationId,
  });


  return {
    reply: chatResult.reply,
    conversationId: chatResult.sessionId,
    usage: {
      inputTokens: estimateTokenCount(latestUserMessage.content),
      outputTokens: estimateTokenCount(chatResult.reply),
      totalTokens:
        estimateTokenCount(latestUserMessage.content) +
        estimateTokenCount(chatResult.reply),
    },
  };
}