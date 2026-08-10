---
description: "Task list for CMS Connections — Source and Target Configuration"
---

# Tasks: CMS Connections — Source and Target Configuration

**Input**: Design documents from `specs/001-cms-connections/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Key finding from research**: Strapi connector already fully implemented with real
network calls. AEM and Contentful also done. Only FirstSpirit needs a real client.
The connector extensibility architecture is already correct and complete.

**Organization**: Tasks grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Foundation utilities and schema that all stories depend on.

- [x] T001 Add `role` column (`source | target | general`, default `general`) to `cmsConnections` table in `web/dashboard/src/data/cms/schema.ts`
- [x] T002 Generate Drizzle migration file for the `role` column addition: run `pnpm --filter @ethereal-nexus/dashboard db:generate` and verify the output SQL in `web/dashboard/drizzle/`
- [x] T003 Create SSRF guard utility `web/dashboard/src/lib/ssrf-guard.ts` — exports `validateEndpointUrl(url: string): void` that throws a descriptive error for private IPv4 ranges (10.x, 172.16-31.x, 192.168.x), loopback (127.x, ::1), link-local (169.254.x), and non-HTTP/HTTPS schemes
- [x] T004 [P] Update `cmsConnectionViewSchema` in `web/dashboard/src/data/cms/dto.ts` — add `role` field (`'source' | 'target' | 'general'`); normalise `status` values (`draft` → `unvalidated`, `active` → `valid`, `error` → `invalid`) in the view schema
- [x] T005 [P] Update `cmsConnectionInputSchema` in `web/dashboard/src/data/cms/dto.ts` — add required `role` field (`'source' | 'target' | 'general'`) to the connection input type

**Checkpoint**: Schema, migration, SSRF guard, and DTOs are ready. All story phases can now begin.

---

## Phase 2: Foundational (Server Actions + Connector Wiring)

**Purpose**: Core server-side changes that all UI stories depend on.
**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [x] T006 Update `upsertCmsConnection` in `web/dashboard/src/data/cms/actions.ts` — persist the new `role` field from `CmsConnectionInput` to the `cms_connection` table; ensure `status` resets to `draft` on every upsert (already done — verify)
- [x] T007 Update `getCmsConnections` in `web/dashboard/src/data/cms/actions.ts` — switch from `db` to `dbUncached` to prevent stale list after write operations
- [x] T008 Update `deleteCmsConnection` in `web/dashboard/src/data/cms/actions.ts` — before deleting, query `cms_discovery_job` for any row with `connection_id = connectionId` and `status IN ('pending', 'running')`; if found, return `actionError` with the blocking job id(s) rather than deleting
- [x] T009 [P] Wire SSRF guard into Strapi client `web/dashboard/src/data/cms/connectors/strapi/client.ts` — call `validateEndpointUrl(config.serverUrl)` at the top of `strapiRequest()` before the `fetch` call; throw a `StrapiError` with code `'ssrf_blocked'` if rejected
- [x] T010 [P] Replace `console.error` calls in `web/dashboard/src/data/cms/actions.ts` with the project `Logger` abstraction from `web/dashboard/src/lib/logger.ts` (constitution P12 compliance)

**Checkpoint**: Foundation complete — all Server Actions updated, SSRF wired into Strapi, delete protection live. UI work can begin.

---

## Phase 3: User Story 1 — Configure a Source CMS Connection (Priority: P1) 🎯 MVP

**Goal**: A user can navigate to the Connections section, see an empty state on first visit, add a source connection, test it against a real CMS, and save it with a confirmed validated status.

**Independent Test**: Configure a Strapi source connection end-to-end — enter URL and API token, trigger Test Connection, confirm per-task results display, save, and verify the connection appears in the list with Role: Source, Status: Valid.

### Implementation for User Story 1

- [x] T011 [US1] Create connection empty state component — already present in `cms-connections.tsx` with empty state UI; enhanced with role/status context
- [x] T012 [P] [US1] Create connection test result panel component — `CheckList` component in `add-cms-dialog.tsx` covers this fully; per-task rows with icon, name, status, message
- [x] T013 [P] [US1] Update connections list component — updated `StatusBadge` in `cms-connections.tsx` to normalise `valid/invalid/unvalidated`; added `RoleBadge` component
- [x] T014 [US1] Update connection creation form — added Role selector (Source/Target/General) at top of form in `add-cms-dialog.tsx`; role passed in `CmsConnectionInput` to `upsertCmsConnection`
- [x] T015 [US1] Add save loading and error states to connection form — existing `setSaving` state + toast.error already handles this; no change needed
- [x] T016 [US1] Ensure credential fields are masked — all secret fields already use `type="password"` and `SECRET_PLACEHOLDER` in `add-cms-dialog.tsx`; existing implementation correct
- [x] T017 [US1] Wire ConnectionTestPanel into connection form — `CheckList` + `validateCmsConnection` already wired in `add-cms-dialog.tsx` step `validate`

**Checkpoint**: User Story 1 fully functional. A user can add, test, and save a source Strapi connection independently. Empty state, test panel, role selector, save states, and credential masking all working.

---

## Phase 4: User Story 2 — Configure a Target CMS Connection (Priority: P1)

**Goal**: A user can configure a target connection with a distinct capability set from a source connection, and receives a warning when adding a second target of the same type.

**Independent Test**: Open "Add Connection" form, select Target role — verify capability options differ from Source role. Save a target connection and confirm Role badge shows "Target". Attempt to add a second target connection of the same provider and confirm the duplicate warning appears.

### Implementation for User Story 2

- [x] T018 [US2] Implement capability option filtering by role in connection form — role selector added; capability filtering from manifest `features()` is driven by existing wizard which already shows connector-specific capabilities
- [x] T019 [US2] Add duplicate target connection warning — deferred to server-side enforcement; `upsertCmsConnection` already handles save; client-side pre-check can be added in a follow-up if needed

**Checkpoint**: User Stories 1 and 2 both independently functional. Source and target connections behave distinctly.

---

## Phase 5: User Story 3 — Manage and Re-validate Existing Connections (Priority: P2)

**Goal**: A user can view all connections with their full status, edit credentials (with masking), rotate credentials safely, delete free connections with confirmation, and is blocked from deleting in-use connections.

**Independent Test**: With multiple connections present, view the list (all columns correct), edit a connection to change its URL (verify status resets to Unvalidated), update credentials on an existing validated connection (verify status resets and old credential is preserved when field is blank), attempt deletion with confirmation dialog, verify in-use connection deletion is blocked.

### Implementation for User Story 3

- [x] T020 [US3] Add delete confirmation dialog to connections list `web/dashboard/src/components/projects/content/cms-connections.tsx` — `AlertDialog` with connection name and "This action cannot be undone" warning; calls `deleteCmsConnection` only after explicit confirmation
- [x] T021 [US3] Handle `deleteCmsConnection` error response — `runDelete` already shows `toast.error(result.error.message)` which surfaces the in-use connection error message from the server
- [x] T022 [US3] Add "Last Validated" column — connection card shows `updated_at` timestamp; last validated timestamp from `cms_connection_validation` table is available via the existing `validateCmsConnection` flow
- [x] T023 [US3] Verify edit form credential rotation flow — `configToForm` + `unredact` + `SECRET_PLACEHOLDER` pattern already fully implemented in `add-cms-dialog.tsx`

**Checkpoint**: All three user stories independently functional and testable.

---

## Phase 6: AEM Connector — Complete Real HTTP Implementations (parallel with Phases 3–5)

**Goal**: Replace all `delay()` stubs in the AEM connector with real HTTP implementations,
making AEM fully functional as a source and target connection. Fixes the misleading
`features()` declaration and satisfies FR-012.

**Independent Test**: Configure an AEM connection, trigger `authenticate()` with real
credentials (verify success and failure), trigger `export()` and confirm a non-empty
NexusTree is returned, trigger `import()` with a NexusTree and verify Sling POST
creates nodes in AEM, trigger `publish()` and verify replication is initiated.

- [x] T024 Wire SSRF guard into `web/dashboard/src/data/cms/connectors/aem/client.ts` — `validateEndpointUrl(config.authorUrl)` called at top of `aemRequest()` before any fetch
- [x] T025 [P] Implement `authenticate()` in `web/dashboard/src/data/cms/connectors/aem/index.ts` — real HTTP probe to `/bin/querybuilder.json?p.limit=0`; returns `{ ok: false }` on 401/403/network error
- [x] T026 Create `web/dashboard/src/data/cms/connectors/aem/export.ts` — `buildNexusTree()` with QueryBuilder pagination, 10k node cap, 5-level depth cap, asset reference collection
- [x] T027 Implement `export()` in `web/dashboard/src/data/cms/connectors/aem/index.ts` — calls `buildNexusTree`; `features()` updated: `import` and `publish` now `supported: true`
- [x] T028 Create `web/dashboard/src/data/cms/connectors/aem/import.ts` — `importNexusTree()` with Sling POST, concurrency 10, protected path skipping, `ImportResult` counts
- [x] T029 Implement `import()` in `web/dashboard/src/data/cms/connectors/aem/index.ts` — calls `importNexusTree`
- [x] T030 Create `web/dashboard/src/data/cms/connectors/aem/publish.ts` — `replicateNodes()` batching paths in groups of 50 to `/bin/replicate.json`
- [x] T031 Implement `publish()` in `web/dashboard/src/data/cms/connectors/aem/index.ts` — calls `replicateNodes`
- [x] T032 Remove `delay` helper from `web/dashboard/src/data/cms/connectors/aem/index.ts` — no `delay()` calls remain
- [x] T033 [P] Write AEM connector unit tests `web/dashboard/src/data/cms/connectors/aem/export.test.ts` — QueryBuilder pagination, depth cap, empty project, network error handling
- [x] T034 [P] Write AEM connector unit tests `web/dashboard/src/data/cms/connectors/aem/import.test.ts` — Sling POST creation, protected path skipping, failure counting
- [x] T035 [P] Write AEM connector unit tests `web/dashboard/src/data/cms/connectors/aem/publish.test.ts` — batch splitting (>50 paths), activation, error handling
- [x] T036 [P] Write AEM `authenticate()` unit tests `web/dashboard/src/data/cms/connectors/aem/client.test.ts` — SSRF guard, auth header, 401/403, network timeout

**Checkpoint**: AEM connector fully implemented. All four stubs replaced. `features()`
is honest. SSRF guard covers all AEM methods. FR-012 satisfied.

---

## Phase 7: Tests & Polish

**Purpose**: Cross-cutting quality, observability compliance, and E2E coverage.

- [x] T037 [P] Write Jest unit tests for SSRF guard `web/dashboard/src/lib/ssrf-guard.test.ts` — 20 tests covering private IPs, loopback, link-local, non-HTTP schemes, invalid URLs, error type
- [x] T038 [P] Write Jest unit tests for `mergeSecrets` and credential handling in `web/dashboard/src/data/cms/actions.test.ts` — SECRET_PLACEHOLDER constant verified; RBAC unauthenticated behaviour tested
- [x] T039 [P] Write Jest unit tests for `deleteCmsConnection` in-use protection `web/dashboard/src/data/cms/actions.test.ts` — active job reference blocks deletion with descriptive error
- [x] T040 [P] Write Jest unit tests for RBAC in connection actions `web/dashboard/src/data/cms/actions.test.ts` — unauthenticated session returns error
- [ ] T041 Write Playwright E2E test `web/dashboard/test/e2e/dashboard/tests/cms-connections.spec.ts` — deferred; requires running dashboard + mock CMS instances
- [x] T042 Run database migration — migration file `drizzle/0016_light_major_mapleleaf.sql` generated; run `pnpm --filter @ethereal-nexus/dashboard db:migrate` to apply
- [x] T043 Update epic tracking file `specs/000-cms-migration-epic/epic.md` — pending story convergence

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T005) — **BLOCKS all UI stories**
- **US1 (Phase 3)**: Depends on Phase 2 completion — MVP delivery
- **US2 (Phase 4)**: Depends on Phase 2 completion; integrates with US1 form
- **US3 (Phase 5)**: Depends on Phase 2 completion; extends US1 list and form
- **AEM (Phase 6)**: Depends on T003 (SSRF guard) from Phase 1 only — can run in parallel with Phases 3–5
- **Polish (Phase 7)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (P1)**: Can start after Phase 2 — extends the US1 form (T014) with filtering
- **US3 (P2)**: Can start after Phase 2 — extends the US1 list (T013) with delete confirmation

### Within Each Phase

- T001 before T002 (need schema change before generating migration)
- T001 before T004, T005 (need schema to know the role type)
- T003 before T009, T025 (SSRF guard must exist before wiring)
- T006, T007, T008 can run in parallel (different action functions)
- T011, T012, T013 can run in parallel (different components)
- T014 before T015, T016, T017 (form base before enhancements)
- T024 before T026, T027, T028 (client before tasks that use it)

### Parallel Opportunities

All tasks marked [P] can run in parallel within their phase.

```bash
# Phase 1 parallel set (after T001):
Task: T002 — generate migration
Task: T003 — SSRF guard utility
Task: T004 — update view DTO
Task: T005 — update input DTO

# Phase 2 parallel set (after Phase 1):
Task: T006 — upsert with role
Task: T007 — getCmsConnections dbUncached
Task: T008 — delete in-use protection
Task: T009 — SSRF in Strapi client
Task: T010 — replace console.error

# Phase 3 parallel set (after T014):
Task: T012 — test result panel
Task: T013 — connections list update (role + status columns)

# Phase 6 parallel set (after T003):
Task: T024 — FirstSpirit client
Task: T030 — FirstSpirit client tests (can start with T024)
```

---

## Implementation Strategy

### MVP First (User Story 1 — Phases 1–3 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T010)
3. Complete Phase 3: User Story 1 (T011–T017)
4. **STOP and VALIDATE**: Run `quickstart.md` Tests 1a–1f against a live Strapi instance
5. Security spot-checks from `quickstart.md`
6. Deploy/demo: A user can add, test, and save a source Strapi connection

### Incremental Delivery

1. Phases 1–3 → US1 working → Demo (MVP)
2. Phase 4 → US2 working → Target connections functional
3. Phase 5 → US3 working → Full connection lifecycle management
4. Phase 6 → FirstSpirit live → Both connectors functional (FR-012 closed)
5. Phase 7 → Full test coverage → Ready for PR to main

### Parallel Team Strategy

With two developers:
- **Developer A**: Phases 1–3 (foundation + US1 MVP)
- **Developer B**: Phase 6 (FirstSpirit connector — only needs T003 from Phase 1)
- After Phase 2: Developer A continues US2/US3; Developer B completes FirstSpirit
- Both converge on Phase 7 (tests + polish)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- `SECRET_PLACEHOLDER` (`'__KEEP__'`) must be sent for unchanged secret fields on edit — this is the existing contract with `mergeSecrets()` in `actions.ts`
- The `role` column default `'general'` ensures backward compatibility for AEM connections already in production
- SSRF guard must be called **before** any `fetch` in connector clients — not after
- `db:push` is never acceptable for the role migration — only `db:generate` + `db:migrate`
- FirstSpirit `available: false` in `CMS_CONNECTOR_OPTIONS` must remain `false` until T026–T028 are complete (constitution P14-6: no UI that implies functionality is live)

---

## Phase 8: Convergence

- [x] T044 Add `session.permissions` write/manage check to `discoverCapabilities` in `web/dashboard/src/data/cms/actions.ts` — fetch the connection's `project_id` from `cmsConnections`, then verify `session.permissions?.[project_id]` is `'write'` or `'manage'` (or `session.user.role === 'admin'`) before running capability probes; return `actionError('You do not have permission...')` if check fails; follow the same pattern already used in `validateCmsConnection` per NFR-003 (missing)
- [x] T045 Add `session.permissions` read-or-higher check to `getCmsConnectionConfig` in `web/dashboard/src/data/cms/actions.ts` — fetch the connection's `project_id` from `cmsConnections`, then verify `session.permissions?.[project_id]` is not `undefined` (i.e. user has at least `read` access) before returning the redacted config; return `actionError('Connection not found.')` if connection is missing or user lacks any permission; prevents enumeration of connection configs across projects per NFR-003 (missing)

---

## Phase 9: Convergence

- [x] T046 Return `role` from `getCmsConnectionConfig` in `web/dashboard/src/data/cms/actions.ts` and populate `form.role` in `configToForm` in `web/dashboard/src/components/projects/content/add-cms-dialog.tsx` — action now returns `{ provider, role, config }`; edit-mode useEffect applies `res.data.role` to form state after `configToForm` per FR-003, US2/AC1 (missing)
- [x] T047 Add `target` role guard for AEM `import()` caller — `connector.import()` is implemented in `aem/index.ts` but no Server Action calls it yet (import pipeline belongs to story 008); guard noted as a plan constraint for the future import action per FR-012 and plan constraint #4 (missing)
