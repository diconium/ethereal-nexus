# `lib/author-chat` — AEM Author Chat Frontend Lib

A **pure browser/client library** for integrating the AEM Author Agent chat into any frontend.

✅ Zero server-side code  
✅ Zero Azure SDK dependency  
✅ No hardcoded URLs  
✅ Moveable to any project (React, web component, AEM, vanilla JS)

---

## Three-Layer Architecture

```
┌──────────────────────────────────────┐
│         Frontend / Mock UI           │  app/author/   ← THIS dashboard's UI
│   (React, web component, AEM, etc.)  │  or your own frontend
│                                      │
│  import { callAuthorChat,            │
│    parseAgentReply,                  │
│    buildSuggestions } from           │
│    "@ethereal-nexus/dialog-ui-core" │
└─────────────────┬────────────────────┘
                  │  fetch(apiUrl, ...)   ← explicit URL, no defaults
┌─────────────────▼────────────────────┐
│          author-chat-api             │  lib/author-chat-api/
│   (Next.js route handler, Azure)     │  STAYS in the dashboard project
│                                      │
│  POST /api/author/chat               │
└─────────────────┬────────────────────┘
                  │  Azure SDK
┌─────────────────▼────────────────────┐
│         Azure AI Foundry             │  Hosted AEM Author Agent
└──────────────────────────────────────┘
```

---

## What Lives Where

| Layer | Location | Can move? | Browser-safe? |
|-------|----------|-----------|---------------|
| Frontend lib | `lib/author-chat/` | ✅ Yes | ✅ Yes |
| API lib (server) | `lib/author-chat-api/` | ✅ Yes (with server) | ❌ No |
| Mock UI | `app/author/` | ✅ Yes | ✅ Yes |
| Next.js route | `app/api/author/chat/` | Thin wrapper | ❌ No |

---

## Frontend Lib — Files

```
lib/author-chat/
  index.ts        ← public barrel, import everything from here
  types.ts        ← AuthorChatRequest/Response/Context/Message/ParsedAgentReply
  client.ts       ← callAuthorChat(request, url)
  parse.ts        ← parseAgentReply(reply) → { message, updatedValues }
  suggestions.ts  ← buildSuggestions(dialogDefinition) → string[]
  README.md       ← this file
```

---

## Installation

Install from npm (recommended for external projects):

```bash
npm install @ethereal-nexus/dialog-ui-core
# or
pnpm add @ethereal-nexus/dialog-ui-core
# or
yarn add @ethereal-nexus/dialog-ui-core
```

Runtime dependencies your project needs:

```json
{}
```

**None.** The lib uses only the browser `fetch` API and pure TypeScript.

---

## API

### `callAuthorChat(request, url)`

Sends a chat turn to the author chat API endpoint.

```ts
import { callAuthorChat } from "@ethereal-nexus/dialog-ui-core";

const response = await callAuthorChat(
  {
    messages: [{ role: "user", content: "Add a new banner" }],
    conversationId: undefined,      // omit on first turn
    context: {
      dialogDefinition: myDialog,   // first turn only — omit on subsequent turns
      values: currentValues,        // send on every turn
    },
  },
  "/api/author/chat",               // same origin
  // or "https://dashboard.example.com/api/author/chat" for cross-origin
);

// response: { reply: string; conversationId: string }
```

**`url`** is always required and explicit — the lib has no knowledge of where the API lives.

---

### `parseAgentReply(reply)`

Splits the structured agent reply into a human message and updated values.

```ts
import { parseAgentReply } from "@ethereal-nexus/dialog-ui-core";

const { message, updatedValues } = parseAgentReply(response.reply);
// message        → string  — show in chat UI
// updatedValues  → unknown | null — apply to your form/dialog if not null
```

Agent reply format:

```
MESSAGE:
Short description of what changed.

UPDATED_VALUES_JSON:
{ "group": { "title": "Winter Sale" } }
```

---

### `buildSuggestions(dialogDefinition)`

Generates context-aware prompt suggestions from a dialog definition JSON.

```ts
import { buildSuggestions } from "@ethereal-nexus/dialog-ui-core";

const suggestions = buildSuggestions(myDialogDefinition);
// e.g. ["Set the \"Title\" field", "Add a new item to \"Banners\"", ...]
```

---

## Types

```ts
import type {
  AuthorChatMessage,
  AuthorChatContext,
  AuthorChatRequest,
  AuthorChatResponse,
  ParsedAgentReply,
} from "@ethereal-nexus/dialog-ui-core";
```

---

## Integration Contract for New Frontends

### State you must manage

| State | Type | Notes |
|-------|------|-------|
| `conversationId` | `string \| undefined` | Returned by first response. Pass on subsequent requests. Reset on new session. |
| `dialogDefinition` | `unknown` | The AEM dialog JSON. Send **once** on first turn only. |
| `values` | `unknown` | Current form values. Send on **every** turn. Update from `updatedValues` after each response. |
| `messages` | `ChatMessage[]` | Local display history. Not sent to the API. |

### Per-message flow

```
1. Append user message to local messages[]
2. Build context:
     - Always include: values (current state)
     - First turn only: dialogDefinition
3. Call callAuthorChat({ messages: [newMsg], conversationId, context }, apiUrl)
4. Receive { reply, conversationId }
5. Call parseAgentReply(reply) → { message, updatedValues }
6. Display `message` in chat UI
7. If updatedValues !== null → update your form/values state
8. Store conversationId for next turn
```

### Reset conditions

Reset `conversationId` (start a new conversation) when:
- User explicitly requests a new session
- `dialogDefinition` changes (user navigated to a different AEM component)

### Cross-origin (AEM web component)

Pass the full dashboard URL as the `url` argument:

```ts
await callAuthorChat(request, "https://your-dashboard.com/api/author/chat");
```

Make sure the dashboard adds CORS headers for your AEM origin (`next.config.ts`):

```ts
async headers() {
  return [{
    source: "/api/author/chat",
    headers: [
      { key: "Access-Control-Allow-Origin", value: "https://your-aem-instance.com" },
      { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type" },
    ],
  }];
}
```

---

## Checklist for a New Frontend

- [ ] Import from `@ethereal-nexus/dialog-ui-core`
- [ ] Pass the full API URL explicitly to `callAuthorChat`
- [ ] Send `dialogDefinition` on the **first turn only**
- [ ] Send `values` on **every turn** (always latest)
- [ ] Pass `conversationId` from the **second turn onward**
- [ ] Parse reply with `parseAgentReply()` — show `message`, apply `updatedValues`
- [ ] Reset `conversationId` when starting a new session
- [ ] Handle errors from `callAuthorChat` (it throws on non-2xx)
