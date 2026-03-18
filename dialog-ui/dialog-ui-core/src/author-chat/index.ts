/**
 * index.ts — PUBLIC API for the Author Chat frontend lib.
 *
 * ✅ 100% browser-safe. No server code, no Azure SDK, no hardcoded URLs.
 * ✅ Can be moved to any project (React app, web component, AEM, etc.)
 *
 * ─────────────────────────────────────────────────────────────────────
 * THREE-LAYER ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────
 *
 *  ┌─────────────────────────┐
 *  │   Mock UI / Frontend    │  app/author/  (or your own frontend)
 *  │  (React, web component) │  — imports from THIS lib
 *  └────────────┬────────────┘
 *               │ fetch (explicit URL)
 *  ┌────────────▼────────────┐
 *  │     author-chat-api     │  lib/author-chat-api/
 *  │  (Next.js route, Azure) │  — server-only, stays in the dashboard
 *  └────────────┬────────────┘
 *               │ Azure SDK
 *  ┌────────────▼────────────┐
 *  │   Azure AI Foundry      │  Hosted agent
 *  └─────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────────
 */

// Types — zero runtime deps, safe everywhere
export type {
  AuthorChatMessage,
  AuthorChatContext,
  AuthorChatRequest,
  AuthorChatResponse,
  ParsedAgentReply,
} from "./types";

// Browser-safe utilities
export { callAuthorChat } from "./client";
export { parseAgentReply } from "./parse";
export { buildSuggestions } from "./suggestions";
