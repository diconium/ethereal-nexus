# Ethereal Nexus — Repository Analysis

> Source of truth for future Spec Kit feature specifications.
> Generated: 2026-08-10. Re-run if the codebase changes significantly.

---

## 1. Application Architecture

### Workspace Layout

pnpm monorepo managed with **Turborepo v2**. `pnpm-workspace.yaml` defines:

```
web/*          → deployable applications
lib/*          → publishable npm packages (the SDK)
examples/**    → demo projects
test/*         → testing suites
dialog-ui/*    → publishable UI component packages
```

The root `package.json` enforces pnpm (>=3). The `postinstall` hook automatically builds
all `lib/*` packages so workspace consumers always have fresh builds.

### Turbo Pipeline

| Task | Dependency | Outputs | Cache |
|---|---|---|---|
| `build` | `^build` (deps first) | `.next/**`, `.astro/**`, `.dist/**` | Yes |
| `publish` | `build` | — | No |

### Package Relationships

```
@ethereal-nexus/root (root)
├── web/dashboard               — main Next.js 16 app (App Router)
├── web/site                    — docs/marketing site (Astro)
├── web/az-serve-static-assets-fn — Azure function for static serving
├── lib/core                    — schema DSL (published)
├── lib/cli                     — publish CLI tool (published)
├── lib/react                   — React Slot component (published)
├── lib/vite-plugin             — Vite build plugin (published)
├── dialog-ui/dialog-ui-core    — headless dialog logic (published)
├── dialog-ui/dialog-ui-shadcn  — shadcn UI dialog renderer (published)
├── dialog-ui/dialog-ui-spectrum — Adobe Spectrum dialog renderer (published)
└── test/e2e                    — Playwright e2e suite
    test/load                   — load testing
```

**Internal dependency graph:**
- `dialog-ui-shadcn` → `dialog-ui-core` (`workspace:*`)
- `lib/vite-plugin` → `lib/core` (`workspace:*`)
- `web/dashboard` → `dialog-ui-core` and `dialog-ui-shadcn` (versioned semver)

---

## 2. Frontend Architecture

### Framework & Rendering

- **Next.js 16.2.11** (App Router) with **React 19.2.7**
- `output: 'standalone'` for Docker deployability
- Server Components by default; explicit `'use client'` boundaries for interactive parts
- Font: Geist Sans / Geist Mono via `next/font`

### Route Groups

```
src/app/
├── layout.tsx                  — Root (ThemeProvider, QueryClientProvider, WebVitalsProvider)
├── auth/                       — Public auth pages (signin, signup, email verify)
├── (iframe)/                   — Components rendered inside an iframe (dialog preview)
└── (session)/                  — Authenticated pages (session layout + sidebar)
    ├── (admin)/                — Admin-only routes
    ├── projects/               — Projects CRUD
    │   └── [id]/
    │       ├── activity/       — Event log
    │       ├── ai/             — Chatbots, catalogues, author dialogs, content advisor
    │       ├── content/        — CMS connections, blueprints, model, mappings
    │       ├── demos/          — Component demos
    │       ├── settings/       — Project + AI settings
    │       └── users/          — Project member management
    └── users/                  — Global user management
```

### State Management

- **TanStack Query v5** — server state, caching, async data
- **React Hook Form v7** + **Zod** — form state and validation
- **next-themes** — dark/light/system theming
- No global client-side state manager (Redux/Zustand); state co-located or in Server Components

### Middleware

`src/proxy.ts` — Next.js Edge middleware; calls `auth()` from NextAuth and redirects
unauthenticated users to `/auth/signin` on all non-API, non-static routes.

---

## 3. Backend Architecture

### API Routes (`src/app/api/`)

```
api/
├── auth/[...nextauth]/         — NextAuth.js handlers
├── v1/                         — Public/SDK-facing REST API
│   ├── components/             — List + upsert component/version
│   ├── projects/[id]/          — Project endpoints
│   ├── environments/[id]/      — Environment endpoints
│   ├── publish/                — POST: upload .tar.gz bundle
│   ├── chatbots/[publicSlug]/  — AI chatbot (streaming, limits)
│   ├── author-dialogs/[slug]/  — AI author dialog
│   ├── [catalogueSlug]/        — Product catalogue (public)
│   ├── search/[publicSlug]/    — Catalogue semantic search
│   ├── cli/apikeys/            — CLI API key management
│   └── cli-auth/               — CLI device-code auth flow
├── catalogues/[slug]/          — Catalogue management
├── chat/                       — Dashboard-internal chat
├── events/query/               — OTEL event query
├── internal/                   — Background AI + analytics jobs
└── logs/                       — Log ingestion (excluded from OTEL)
```

### Server Actions Pattern

Data layer uses Next.js **Server Actions** (`'use server'`). Each domain has
`actions.ts` with typed async functions returning `ActionResponse<T>`:

```typescript
type ActionResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: Error };
```

Pattern: `auth()` → validate permissions → Zod safeParse → DB op → return typed result.

### API Authentication (`src/app/api/utils.ts`)

`authenticatedWithApiKeyUser()` supports two token types from `Authorization` header:
- `APIKey <uuid>` — looks up API key in DB
- `Bearer <jwt>` — decodes JWT, finds service user, introspects via OIDC

CORS `Access-Control-Allow-Origin: *` is set globally on all `/api/*` routes.

---

## 4. Database / Data Model

### ORM & Client

- **Drizzle ORM** (`drizzle-orm@^0.45.2`) with **drizzle-kit** for migrations
- Two adapters via `DRIZZLE_DATABASE_TYPE` env var:
  - `postgres` (default) — `postgres.js`, connection pool (max 25, idle 20s)
  - `neon` — `@neondatabase/serverless` for serverless/edge
- **Caching layer** (`DB_CACHE_STRATEGY`): `redis` (ioredis) or in-memory (default)
- Two instances: `db` (cached) and `dbUncached`
- `@epic-web/remember` prevents multiple instances during HMR

### Schema Files (per domain, glob: `src/data/**/schema.ts`)

#### Users (`src/data/users/schema.ts`)
| Table | Key Columns |
|---|---|
| `user` | `id` (uuid PK), `email`, `password` (nullable), `role` (admin/user/viewer), `type` (email/oauth), `issuer`, `subject` |
| `api_key` | `id`, `key` (uuid unique), `user_id` (FK→user), `alias`, `permissions` (jsonb) |
| `invite` | `id`, `key`, `email` |
| `account` | `userId`+`provider`+`providerAccountId` (PK), OAuth token fields |
| `verification_token` | `identifier`+`token` (PK), `expires` |

#### Projects (`src/data/projects/schema.ts`)
| Table | Key Columns |
|---|---|
| `project` | `id`, `name` (unique), `description` |
| `environment` | `id`, `project_id` (FK), `name`, `secure`, `description` |
| `project_component_config` | `environment_id`+`component_id` (PK), `component_version`, `is_active`, `ssr_active` |
| `feature_flags` | `id`, `project_id`, `component_id`, `environment_id`, `flag_name`, `enabled` |

#### Components (`src/data/components/schema.ts`)
| Table | Key Columns |
|---|---|
| `component` | `id`, `slug` (unique), `name`, `title`, `description`, `is_ai_generated` |
| `component_version` | `component_id`+`version` (PK), `dialog` (jsonb), `readme`, `changelog` |
| `component_assets` | `component_id`+`version_id`+`url` (PK), `type` enum (css/js/chunk/server) |

#### Members / RBAC (`src/data/member/schema.ts`)
| Table | Key Columns |
|---|---|
| `member` | `user_id`+`resource` (PK), `permissions` (read/write/manage), `role` |

`resource` is an untyped UUID (no FK) — can reference project, environment, or component.

#### Events (`src/data/events/schema.ts`)
| Table | Key Columns |
|---|---|
| `event` | `id`, `type` (enum ~12 types), `resource_id`, `user_id`, `timestamp`, `data` (jsonb) |

#### AI (`src/data/ai/schema.ts`) — 1028 lines, 29+ tables
Key tables:
- `project_ai_chatbot` — chatbot config (provider, agent_id, slugs, enabled)
- `project_ai_chatbot_api_setting` — rate limiting, message limits, session caps, IP budgets
- `project_ai_chatbot_session` / `project_ai_chatbot_event` — per-session/event analytics
- `project_ai_catalogue` / `project_ai_catalogue_version` — product catalogues
- `project_ai_author_dialog` — author-facing AI dialog
- `project_ai_content_advisor_*` — scheduled content analysis (runs, agents, issues, detections)

#### CMS (`src/data/cms/schema.ts`) — Blueprint knowledge graph
- `cms_provider`, `cms_connection` (AES-GCM encrypted config), `cms_connection_validation`
- `cms_blueprint_definition`, `cms_blueprint_snapshot` (versioned)
- `cms_blueprint_node` — graph node (kind: site/page/component/field/asset/model/template…)
- `cms_blueprint_edge` — typed edge (contains/references/inherits/uses/extends…)
- `cms_blueprint_change`, `cms_discovery_job`

**Invariant (from AGENTS.md):** The Blueprint is immutable — it NEVER holds Nexus IDs,
mappings, or generated components. Mapping/Provision belong to the Design domain.

#### Meta Design (`src/data/meta/design/schema.ts`)
- `nexus_library` — project-scoped canonical content model container
- `nexus_library_definition` — canonical Component / Content Type / Layout definition

#### Meta Mapping & Provision (`src/data/meta/mapping/`, `src/data/meta/provision/`)
Partially stubbed; not yet implemented.

### Migrations

16 SQL migration files in `drizzle/` (0000→0015). `drizzle.config.ts` at dashboard root.

---

## 5. Major Modules

### `@ethereal-nexus/core` (`lib/core/`)
Schema DSL library. Compiled with tsup (CJS + ESM + `.d.ts`).

Field types: `text`, `checkbox`, `select`, `rte`, `calendar`, `media`, `pathbrowser`,
`multifield`, `tags`, `datasource`, `group`, `dynamic`, `navigation`, `hidden`,
`optional`, `object`, `dialog` (root)

Each field exports:
- Factory function (e.g., `text({ label, placeholder, required })`)
- `_parse()` — serializes to dialog JSON
- `_primitive()` — returns prop primitive type for Web Component attribute declarations

`dialog()` builds a `DialogBuilder` supporting `.tabs()` and `.conditions()`.

**`@webcomponent` decorator:**
- Wraps a React component as a Custom Element using `@r2wc/react-to-web-component`
- Shadow DOM (`shadow: 'open'`)
- On `connectedCallback`: reads `data-css-urls` attribute and injects `<link>` into shadow root

### `@ethereal-nexus/cli` (`lib/cli/`)
Commander.js CLI (`ethereal` binary):

| Command | Description |
|---|---|
| `init` | Creates `.etherealrc` config |
| `auth` | Opens browser → obtains API key via `/api/v1/cli-auth` |
| `publish [components...]` | Tars build output, POSTs to `/api/v1/publish` |

### `@ethereal-nexus/vite-plugin-ethereal-nexus` (`lib/vite-plugin/`)
Rollup/Vite plugin (`rollupEthereal`) — compiles Ethereal Nexus components:

- `buildStart` — extracts exposed component entry points
- `transform` — AST-parses to extract dialog, bundles client (+ optional SSR via esbuild)
- `generateBundle` — moves nexus files, generates `manifest.json` per component
- Uses `acorn`/`acorn-walk`, `magic-string`, `@swc/core`, `esbuild`

### `@ethereal-nexus/react` (`lib/react/`)
Single export: `<Slot>` component.
- Finds slotted Custom Elements, applies props as HTML attributes
- Handles AEM Experience Fragment wrapper pattern
- Uses `MutationObserver` to re-apply props when AEM editor wraps/unwraps elements

### `@ethereal-nexus/dialog-ui-core` (`dialog-ui/dialog-ui-core/`)
Headless dialog processing (framework-agnostic React hooks):
- `DialogProcessor` class — form state, validation, field updates, error tracking
- `useDialogProcessor` hook — React hook wrapper
- `adapters/` — schema format adapters

### `@ethereal-nexus/dialog-ui-shadcn` (`dialog-ui/dialog-ui-shadcn/`)
shadcn/ui dialog renderer. Tailwind CSS v3 + Radix UI. Has Storybook stories.

### `@ethereal-nexus/dialog-ui-spectrum` (`dialog-ui/dialog-ui-spectrum/`)
Adobe Spectrum dialog renderer.

---

## 6. Reusable Components

Located at `web/dashboard/src/components/`:

- `ui/` — ~40 locally-owned shadcn/ui primitives (button, card, input, select, dialog,
  data-table, sidebar, chart, calendar, command palette, etc.)
- `components/` — component management views, AI generator (WebContainer-based)
- `projects/` — project tables, CMS connector UI, blueprint explorer
- `user/` — user profile, avatar
- `search.tsx` — global cmdk command palette
- `theme-provider.tsx` — next-themes wrapper
- `web-vitals-provider.tsx` — Web Vitals reporting

---

## 7. APIs

### V1 REST API (`/api/v1/`) — requires `APIKey` or `Bearer` auth

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/components` | List all components |
| POST | `/api/v1/components` | Upsert component + version |
| GET/PUT | `/api/v1/components/[name]/versions/` | Component version management |
| GET/PUT | `/api/v1/projects/[id]/` | Project CRUD |
| GET/PUT | `/api/v1/environments/[id]/` | Environment management |
| POST | `/api/v1/publish` | Upload component bundle (.tar.gz multipart) |
| POST | `/api/v1/chatbots/[publicSlug]/messages` | Chat message (streaming AI) |
| GET | `/api/v1/chatbots/[publicSlug]/limits` | Rate limit status |
| POST | `/api/v1/author-dialogs/[publicSlug]/` | Author dialog AI |
| GET | `/api/v1/[catalogueSlug]` | Catalogue data (public, no auth) |
| POST | `/api/v1/search/[publicSlug]` | Catalogue semantic search |
| GET/POST | `/api/v1/cli/apikeys` | CLI API key management |
| POST | `/api/v1/cli-auth` | CLI device code flow |

### Response Conventions
- `NextResponse.json()` throughout
- `HttpStatus` enum (200/204/400/401/403/404/409/500) in `api/utils.ts`
- Data layer returns `ActionResponse<T>` discriminated union

---

## 8. Authentication / Authorization

### Auth Strategy
**NextAuth.js v5 beta** (`next-auth@5.0.0-beta.30`), JWT session (max age 7 days).

### Identity Providers
1. **Credentials** — email + bcrypt; supports email verification flag
2. **GitHub OAuth** — `AUTH_GITHUB_ID/SECRET`
3. **Microsoft Entra ID** — `AUTH_MICROSOFT_ENTRA_ID_*`
4. **Keycloak** — conditional; token introspection + refresh on every JWT callback
5. **Azure Communication Services** — magic-link / passwordless

**Note:** `allowDangerousEmailAccountLinking: true` on Entra ID and Keycloak providers.
**Note:** `debug: true` in `auth.config.ts` — verbose logging always on.

### RBAC

**User roles** (global on `user.role`): `admin` | `user` | `viewer`
- `admin` → always `write` everywhere
- `viewer` → always `read`
- `user` → resolved from `member` table

**Resource permissions** (`member.permissions`): `none` | `read` | `write` | `manage`
- `member` links `user_id` → `resource` UUID (project/env/component), no FK constraint
- `role` on member: `owner` (→ `manage`) or `user` (→ explicit permissions)

**API key permissions:** jsonb map of resource key → permission level.

---

## 9. Testing Strategy

### Dashboard — Jest
- `jest.config.js` at `web/dashboard/`
- `jest-environment-jsdom`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`
- TZ=UTC forced; 75% max workers

### E2E — Playwright (`test/e2e/`)
- `@playwright/test@^1.48.2`
- Page Object Model in `dashboard/pages/`
- Fixtures (`dashboard/fixtures/`), auth setup (`dashboard/auth/`)
- Zod for fixture validation, dotenv for env vars

### dialog-ui — Vitest
Both `dialog-ui-core` and `dialog-ui-shadcn` use Vitest.

### Libraries — No Tests
`lib/core`, `lib/react`, `lib/vite-plugin` have `"test": "echo no test"` — zero test coverage.

### Load Tests
`test/load/` exists; not fully explored.

---

## 10. Build / Deployment

### Local Development
```bash
pnpm install           # installs + builds lib/* (postinstall)
pnpm build             # builds everything via turbo
pnpm --filter @ethereal-nexus/dashboard dev
```

### Docker (`web/dashboard/Dockerfile`) — 3-stage
1. `deps` — Alpine Node 22, pnpm 10.29.2, `pnpm i --frozen-lockfile --ignore-scripts`
2. `builder` — full monorepo, `pnpm --filter "@ethereal-nexus/dashboard" build`
3. `runner` — minimal Alpine, non-root `nextjs` user, `node web/dashboard/server.js`

**Note:** Dockerfile copies the entire monorepo root into the builder stage.

### Docker Compose
- `dashboard` — Next.js on port 3000
- `redis` — Redis 7 Alpine (with password)
- `otel-collector` — OTLP HTTP/gRPC receivers, SigNoz + New Relic exporters

### Publishing Libraries
```bash
pnpm release    # changeset publish for lib/* and dialog-ui/*
```

Changesets (`@changesets/cli@3.0.0-next.5` — pre-release!) manages versions + changelogs.

### Database Migrations
```bash
pnpm --filter @ethereal-nexus/dashboard db:generate   # generate SQL
pnpm --filter @ethereal-nexus/dashboard db:migrate    # run migrations
pnpm --filter @ethereal-nexus/dashboard db:push       # dev only
```

---

## 11. Coding Conventions

### TypeScript
- TypeScript 5.9.3 across all packages
- Path alias `@/*` → `src/*` in dashboard
- Libraries compiled with tsup (CJS + ESM + `.d.ts`)

### Linting / Formatting
- ESLint (`eslint-config-next`) in dashboard
- Prettier (`^3.8.3`) repo-wide — `prettier --write "{,!(.next)/**/}*.{ts,tsx}"`

### File Naming
- Components: `PascalCase.tsx`
- Routes: `route.ts`, `page.tsx`, `layout.tsx` (Next.js conventions)
- Data/util files: `camelCase.ts`
- Per-domain standard files: `schema.ts`, `actions.ts`, `dto.ts`

### Server Actions Pattern
```typescript
'use server';
export async function doSomething(input: Input): Promise<ActionResponse<Result>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: new Error('Unauthorized') };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error };
  try {
    const data = await db.query...;
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e as Error };
  }
}
```

---

## 12. UI / Design System

### Component Library
**shadcn/ui** — "new-york" style, locally owned. `components.json`:
- Base color: `slate`
- CSS variables: `true`
- RSC: `true`

### Styling
- **Tailwind CSS v4** (`tailwindcss@^4.3.0`) with `@tailwindcss/postcss`
- CSS custom properties for design tokens (light/dark)
- `tailwind-merge` + `class-variance-authority` (CVA) + `clsx`
- `tw-animate-css`, `@tailwindcss/container-queries`

### Radix UI Primitives
`@radix-ui/react-*`: alert-dialog, avatar, checkbox, collapsible, dialog,
dropdown-menu, label, popover, scroll-area, select, separator, slot, switch, tabs, tooltip

### Icons
- **Lucide React** (`lucide-react@^0.577.0`) — primary
- **Radix Icons** — secondary

### Charts
Recharts v3.

---

## 13. Important Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.11 | App Router, SSR, API routes |
| `react` | 19.2.7 | UI framework |
| `drizzle-orm` | ^0.45.2 | ORM |
| `next-auth` | 5.0.0-beta.30 | Auth (**beta**) |
| `@tanstack/react-query` | ^5.100.14 | Server state |
| `react-hook-form` | ^7.76.1 | Forms |
| `zod` | ^3.25.76 | Validation |
| `ai` | ^5.0.192 | Vercel AI SDK |
| `@azure/storage-blob` | ^12.31.0 | Component asset storage |
| `@google-cloud/storage` | 7.19.0 | GCS asset storage |
| `ioredis` | ^5.11.0 | Cache + rate limiting |
| `@vercel/otel` | ^2.1.2 | OpenTelemetry |
| `turbo` | ^2.9.16 | Monorepo task orchestration |
| `tsup` | ^8.5.1 | Library bundler |
| `@changesets/cli` | 3.0.0-next.5 | Version management (**pre-release**) |

---

## 14. Technical Debt

### Known TODOs
- `src/components/projects/table/data-table-row-actions.tsx:95` — duplicate dialog components
- `src/components/components/create/utils/chat-context.tsx:10` — `etherealNexusComponentMockedProps: any // TODO: Define type`
- `src/components/components/create/chat.tsx:515` — possible stale files in WebContainer dist folder

### Beta / Pre-release Dependencies
- `next-auth@5.0.0-beta.30` — entire auth system on a beta library
- `@changesets/cli@3.0.0-next.5` — pre-release versioning tool

### Missing Test Coverage
`lib/core`, `lib/react`, `lib/vite-plugin` have zero unit tests — critical gap for published packages.

### Unimplemented Features (from AGENTS.md)
- `data/meta/mapping/` — partially stubbed
- `data/meta/provision/` — not implemented
- Strapi and FirstSpirit connectors — network calls stubbed
- Migration Jobs, Export/Import/Publish — UI visual only
- Semantic Layer for AI — boundary reserved, not built
- Scheduled re-discovery — not implemented
- Snapshot history UI + visual diff — not implemented

### Other Issues
- **Dual logger**: both `pino` and `winston` installed — transitional state
- **`auth.config.ts` `debug: true`** — verbose NextAuth debugging always on in production
- **CORS `*`** on all `/api/*` routes — overly permissive
- **`allowDangerousEmailAccountLinking: true`** on Entra ID and Keycloak

---

## 15. Areas to Avoid or Treat Carefully

### `next-auth@5.0.0-beta.30`
Entire auth system is on a beta release. Do not change auth plumbing without testing
all flows (credentials, GitHub, Entra ID, Keycloak, Azure magic link). Understand the
full JWT/session callback chain before touching.

### Database Schema Changes
Schema is spread across 10+ domain `schema.ts` files. Always use `db:generate`
(not `db:push` in production). The AI schema is 1028 lines with 15+ related tables —
changes ripple widely.

### CMS Blueprint Graph Tables
The Blueprint is **immutable** — it never holds Nexus IDs, mappings, or generated
components. Mapping/Provision belong to the Design domain. Mixing these domains will
break the architecture invariant.

### `src/proxy.ts` (Next.js Middleware / Edge Runtime)
Authentication gate for all non-API routes. Runs on Edge Runtime — must not import
Node.js-only modules. Keep it simple.

### `EtherealStorage` Cloud Provider Switching
Storage switches between Azure Blob and GCloud via `STORAGE_TYPE` env var. Changing
backends without migrating existing asset URLs will break all deployed components.

### `@webcomponent` Decorator and Shadow DOM CSS Injection
Reads `data-css-urls` JSON attribute to inject stylesheets into shadow root. Any change
to asset URL structure or the attribute name breaks CSS in all deployed Web Components.

### Keycloak Token Refresh on Every Request
JWT callback introspects Keycloak tokens on every session check — adds latency; if
Keycloak is down and token is expired, the session is invalidated.

### Rate Limiting Dual Backend
Falls back from Redis to in-memory if Redis is unavailable. In multi-instance
deployments, in-memory fallback means rate limits are per-instance. Ensure Redis
is always available in production.

### `WebContainer` API and Cross-Origin Headers
`Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`
are set globally for the WebContainer (AI component generator). Removing these breaks
the feature; they cannot be made route-selective without significant refactoring.

### Dual `db` / `dbUncached` Instances
Most queries go through the cached `db` instance. For write-then-read patterns, use
`dbUncached` or ensure cache invalidation — otherwise stale data will be returned.

### `member.resource` Untyped UUID (No FK Constraint)
`member.resource` can reference project, environment, or component with no referential
integrity. Deleting a resource does not cascade-delete memberships. Always verify the
referenced resource still exists when resolving permissions.

### Library Publishing with `workspace:*`
`lib/vite-plugin` and `dialog-ui-shadcn` use `workspace:*`. Ensure versions are bumped
in sync before releasing to npm.
