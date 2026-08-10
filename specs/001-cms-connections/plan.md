# Implementation Plan: CMS Connections — Source and Target Configuration

**Branch**: `001-cms-connections` | **Date**: 2026-08-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-cms-connections/spec.md`

---

## Summary

This story completes the CMS Connections management feature for the Ethereal Nexus
dashboard. The core infrastructure is already in place: the connector architecture
(CMSConnector interface, Manifest, config schemas, AES-GCM encryption, Server Actions)
is production-ready. The primary work is:

1. **Add `role` column** to `cms_connection` + Drizzle migration
2. **Replace FirstSpirit stubs** with a real HTTP client
3. **Add SSRF protection** utility + wire into all connector clients
4. **Normalise status values** in the DTO layer (draft → unvalidated, active → valid)
5. **UI: role selector, empty state, save states, delete confirmation, credential masking**
6. **Switch `getCmsConnections` to `dbUncached`**
7. **Block delete on in-use connections**

The Strapi connector is already fully implemented. Contentful and AEM are also done.
The connector extensibility architecture (FR-002, NFR-005) is already correct.

---

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict)

**Primary Dependencies**:
- Next.js 16.2.11 App Router (Server Actions, Server Components)
- Drizzle ORM 0.45.x + drizzle-kit (migrations)
- React Hook Form v7 + Zod v3 (form validation)
- TanStack Query v5 (client-side list re-fetch after mutations)
- shadcn/ui "new-york" + Tailwind CSS v4 (UI)
- Lucide React (icons)

**Storage**: PostgreSQL via `postgres.js` (prod) or Neon (serverless)

**Testing**: Jest + Testing Library (Server Actions); Playwright (E2E); MSW (connector unit tests)

**Target Platform**: Next.js dashboard (`web/dashboard/`) — deployed as Docker container

**Performance Goals**: Connection test ≤ 10s (NFR-002); list load ≤ 500ms

**Constraints**:
- AES-GCM encryption key via `CMS_CONNECTOR_ENCRYPTION_KEY` env var (must be present)
- Additive schema changes only — no existing columns modified
- `db:push` not permitted in production — migration files required
- No connector code on the client — server-only imports enforced
- SSRF protection must fire before any `fetch` call in connectors

**Scale/Scope**: Per-project connections list (typically 2–10 connections); validation runs serially per connection

---

## Constitution Check

*GATE: Must pass before implementation begins. Re-check after PR review.*

| Principle | Check | Status |
|---|---|---|
| P1 — Framework Agnosticism | Connector interface is CMS-agnostic; no CMS-specific logic in Nexus Core | ✅ Pass |
| P3 — Monorepo Integrity | All changes within `web/dashboard/` workspace; no new packages | ✅ Pass |
| P4 — Trunk-Based Development | Feature branch `001-cms-connections` → PR → main | ✅ Pass |
| P5 — Security-First | AES-GCM reuse; SSRF guard; no credential exposure; secrets never returned to client | ✅ Pass — SSRF guard is new work |
| P7 — Data Layer Governance | Drizzle migration file required; additive only; `dbUncached` for write-then-read | ✅ Pass — migration is task T005 |
| P8 — Auth/RBAC | `auth()` on all actions; existing `write`/`read` permissions sufficient; no auth config changes | ✅ Pass |
| P9 — Testing | Jest for Server Actions + SSRF; Playwright for E2E; MSW for connector unit tests | ✅ Pass |
| P11 — UI Consistency | shadcn/ui primitives; Tailwind CSS v4; Lucide icons; no inline styles | ✅ Pass |
| P12 — Observability | Logger abstraction for errors; no `console.log` in production paths | ✅ Pass — existing `console.error` in actions.ts must be replaced |
| P13 — API Design | No new `/api/v1/` routes; Server Actions only for dashboard operations | ✅ Pass |
| P14-6 — Stub replacement | Both Strapi (already done) and FirstSpirit stubs must be fully replaced | ⚠️ Partial — FirstSpirit is the open item |
| P14-12 — `dbUncached` | `getCmsConnections` must use `dbUncached` | ✅ Pass — task T006 |
| P14-13 — `member.resource` | RBAC checks use project UUID as resource; project existence must be verified | ✅ Pass |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-cms-connections/
├── spec.md
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── server-actions.md ← Phase 1 output
├── reviews/
│   ├── product-owner.md
│   ├── ui-ux.md
│   ├── lead-developer.md
│   └── cross-review.md
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
web/dashboard/
├── drizzle/
│   └── XXXX_cms_connection_role.sql     ← new migration
│
├── src/
│   ├── lib/
│   │   └── ssrf-guard.ts                ← NEW: SSRF URL validation utility
│   │
│   ├── data/cms/
│   │   ├── schema.ts                    ← add `role` column to cmsConnections
│   │   ├── dto.ts                       ← add `role` to view schema; normalise status values
│   │   ├── actions.ts                   ← add role to upsert; dbUncached for getCmsConnections;
│   │   │                                   block delete on in-use connections; replace console.error
│   │   └── connectors/
│   │       ├── strapi/
│   │       │   └── client.ts            ← add validateEndpointUrl() call before fetch
│   │       └── firstspirit/
│   │           ├── index.ts             ← replace delay() stubs with real tasks
│   │           └── client.ts            ← NEW: FirstSpirit HTTP client
│   │
│   └── components/projects/content/
│       ├── connections/                 ← existing or new directory
│       │   ├── connections-list.tsx     ← update: add role column, normalised status badge,
│       │   │                               empty state, delete confirmation dialog
│       │   ├── connection-form.tsx      ← update: add role selector, save loading/error states,
│       │   │                               credential masking (SECRET_PLACEHOLDER), test result panel
│       │   └── connection-test-panel.tsx ← NEW: per-task result display
│       └── [id]/content/page.tsx        ← verify connections section renders
│
└── test/e2e/
    └── dashboard/tests/
        └── cms-connections.spec.ts      ← NEW: E2E tests per quickstart.md
```

**Structure Decision**: Web application pattern. All changes within `web/dashboard/`.
The connector code is server-only (never bundled to the client). UI components live
in `src/components/projects/content/`. Server Actions in `src/data/cms/actions.ts`.

---

## Complexity Tracking

No constitution violations requiring justification.

---

## Phase 0: Research Complete

See [research.md](research.md) for all decisions and unknowns resolved.

Key finding: **Strapi connector is already fully implemented**. The story's connector
work is exclusively the FirstSpirit stub replacement.

---

## Phase 1: Design Artefacts Complete

- [data-model.md](data-model.md) — schema changes, status normalisation, SSRF guard
- [contracts/server-actions.md](contracts/server-actions.md) — action signatures, UI contracts
- [quickstart.md](quickstart.md) — end-to-end validation scenarios

---

## Implementation Notes for `/speckit.tasks`

When generating tasks, use these phases and order:

**Phase 1 — Foundation** (must complete before UI work):
1. `ssrf-guard.ts` utility (new file, no dependencies)
2. Schema: add `role` column + generate migration
3. DTO: add `role` to view schema; normalise status values (`draft`→`unvalidated` etc)
4. `actions.ts`: add `role` to upsert; switch `getCmsConnections` to `dbUncached`; block delete on in-use
5. Wire SSRF guard into `strapi/client.ts`

**Phase 2 — FirstSpirit** (parallel with Phase 3 after Phase 1):
6. FirstSpirit `client.ts` — HTTP client with real network calls
7. FirstSpirit `index.ts` — replace `delay()` stubs with real tasks using client
8. Wire SSRF guard into FirstSpirit client
9. FirstSpirit connector tests (MSW)

**Phase 3 — UI** (requires Phase 1; parallel with Phase 2):
10. Connections list: role column, normalised status badge
11. Empty state for Connections section
12. Connection form: role selector
13. Connection form: save loading + error states
14. Connection form: credential masking (SECRET_PLACEHOLDER)
15. Test result panel (per-task inline display)
16. Delete confirmation dialog

**Phase 4 — Tests & Polish**:
17. Jest unit tests: SSRF guard, `mergeSecrets`, action permission checks
18. Playwright E2E: per quickstart.md test scenarios
19. Replace `console.error` calls in `actions.ts` with Logger abstraction
20. Update epic tracking file (`specs/000-cms-migration-epic/epic.md`)
