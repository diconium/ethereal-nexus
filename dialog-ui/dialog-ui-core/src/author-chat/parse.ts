/**
 * parse.ts — pure utility for parsing the agent reply format.
 *
 * No runtime dependencies. Works in browser and server.
 *
 * Agent reply format:
 *   MESSAGE:
 *   <short description>
 *
 *   UPDATED_VALUES_JSON:
 *   { ... }
 */

import type { ParsedAgentReply } from "./types";

const MESSAGE_MARKER = "MESSAGE:";
const JSON_MARKER = "UPDATED_VALUES_JSON:";

export function parseAgentReply(reply: string): ParsedAgentReply {
  const jsonIndex = reply.indexOf(JSON_MARKER);

  if (jsonIndex !== -1) {
    const jsonPart = reply.slice(jsonIndex + JSON_MARKER.length).trim();
    let messagePart = reply.slice(0, jsonIndex).trim();

    if (messagePart.toUpperCase().startsWith(MESSAGE_MARKER)) {
      messagePart = messagePart.slice(MESSAGE_MARKER.length).trim();
    }

    const firstBrace = jsonPart.indexOf("{");
    const lastBrace = jsonPart.lastIndexOf("}");
    let updatedValues: unknown | null = null;

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        updatedValues = JSON.parse(jsonPart.slice(firstBrace, lastBrace + 1));
      } catch {
        // malformed JSON — surface the message, drop the values
      }
    }

    return { message: messagePart || reply, updatedValues };
  }

  // No JSON block — strip MESSAGE: label if present
  let message = reply.trim();
  if (message.toUpperCase().startsWith(MESSAGE_MARKER)) {
    message = message.slice(MESSAGE_MARKER.length).trim();
  }

  return { message, updatedValues: null };
}

