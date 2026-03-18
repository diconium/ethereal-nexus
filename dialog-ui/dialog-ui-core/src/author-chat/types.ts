/**
 * types.ts — shared types for the Author Chat lib.
 *
 * Imported by both the client-side helper and the server-side agent.
 * No runtime dependencies — safe everywhere.
 */

export interface AuthorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AuthorChatContext {
  /**
   * Full dialog definition JSON.
   * Send ONLY on the first turn; omit on subsequent turns.
   */
  dialogDefinition?: unknown;
  /**
   * Current values JSON.
   * Send on EVERY turn so the agent always sees the latest state.
   */
  values: unknown;
}

export interface AuthorChatRequest {
  /** Always exactly one user message per call. */
  messages: AuthorChatMessage[];
  /**
   * Conversation ID returned by the previous response.
   * Omit on the first turn; required on all subsequent turns.
   */
  conversationId?: string;
  context: AuthorChatContext;
}

export interface AuthorChatResponse {
  /**
   * Raw reply from the agent.
   * Format:
   *   MESSAGE:
   *   <short description>
   *
   *   UPDATED_VALUES_JSON:
   *   { ... }
   *
   * Parse with parseAgentReply() to split message text from updated values.
   */
  reply: string;
  conversationId: string;
}

export interface ParsedAgentReply {
  /** Human-readable message to show in the UI. */
  message: string;
  /** Updated values JSON if the agent modified them, otherwise null. */
  updatedValues: unknown | null;
}

