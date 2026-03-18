/**
 * client.ts — browser-side fetch helper for the Author Chat API.
 *
 * ✅ Safe to use in React components, web components, any browser bundle.
 * ❌ No server-side code, no Azure SDK, no hardcoded URLs.
 *
 * The API URL is passed explicitly so this lib has zero knowledge of
 * where the endpoint lives. The consumer decides the URL.
 *
 * Usage:
 *   import { callAuthorChat } from "@/lib/author-chat";
 *
 *   // Same origin (Next.js app)
 *   const res = await callAuthorChat(request, "/api/author/chat");
 *
 *   // Cross-origin (AEM web component)
 *   const res = await callAuthorChat(request, "https://your-dashboard.com/api/author/chat");
 */

import type { AuthorChatRequest, AuthorChatResponse } from "./types";

export async function callAuthorChat(
  request: AuthorChatRequest,
  /** Full URL of the author chat endpoint. */
  url: string,
): Promise<AuthorChatResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }

  return res.json() as Promise<AuthorChatResponse>;
}
