# Research: CMS Connections — Source and Target Configuration

**Branch**: `001-cms-connections` | **Date**: 2026-08-10 | **Spec**: [spec.md](spec.md)

---

## Summary

Direct codebase inspection revealed the existing implementation is significantly more
complete than the repository analysis indicated. Most architectural decisions are
already made. This document records what was discovered and resolves all planning
unknowns.

---

## Decision 1 — Strapi connector status

**Decision**: Strapi is **already fully implemented** with real network calls.

**Evidence**: `src/data/cms/connectors/strapi/index.ts` — 7 real validation tasks
(reachable, auth, version, admin-api, content-types, components, upload-plugin), 4
real capability probes (rest, assets, translation, publishing), 4 real discovery tasks.
`src/data/cms/connectors/strapi/client.ts` — 626-line HTTP client using `fetch` with
proper AbortController timeout, error mapping, and typed response shapes.

**Implication for spec**: FR-011 ("The Strapi connector MUST implement actual network
calls...") is already satisfied. This story's work for Strapi is **validation UI
integration** — ensuring the existing connector is wired to the connection management
UI correctly, not re-implementing the connector itself.

**Rationale**: Direct file inspection.
**Alternatives considered**: None — the code speaks for itself.

---

## Decision 2 — FirstSpirit connector status

**Decision**: FirstSpirit is **stubbed with `delay()` calls** — all validation tasks,
capability probes, and discovery tasks return hardcoded success results after a
simulated delay.

**Evidence**: `src/data/cms/connectors/firstspirit/index.ts` — all tasks call
`await delay(N)` and return `{ status: 'success' }` or fixed capability results.
No HTTP client exists for FirstSpirit.

**Implication for spec**: FR-012 ("The FirstSpirit connector MUST implement actual
network calls...") is the primary new development work for connectors. A FirstSpirit
HTTP client (`connectors/firstspirit/client.ts`) must be created. The FirstSpirit API
uses a REST API with session-based authentication (`username`/`password` in
`firstSpiritConfigSchema`).

**Rationale**: Direct file inspection.
**Alternatives considered**: None.

---

## Decision 3 — Additional connectors in scope

**Decision**: The codebase also has **AEM** (fully implemented with real HTTP) and
**Contentful** (fully implemented with real HTTP, including tests). `datocms` is
registered but unimplemented. The spec scopes to Strapi and FirstSpirit only —
this is correct. AEM and Contentful are already done.

**Implication**: The connector architecture is already extensible (AGENTS.md §11
documents the exact checklist). FR-002 and NFR-005 are already satisfied
architecturally. No new architecture work needed for extensibility.

---

## Decision 4 — Schema: `role` field (source/target)

**Decision**: The `cms_connection` table currently has **no `role` column**. The
schema has: `id`, `project_id`, `environment_id`, `provider`, `name`,
`configuration` (AES-GCM text), `status` (text, default `draft`), `capabilities`
(jsonb array), `health` (jsonb), `created_at`, `updated_at`.

**Implication**: A new `role` column is needed (`source | target | general`). Since
the existing connections (AEM in the wild) were created without a role, the migration
must default existing rows to `general` or `source`. Additive change — no existing
column is modified. A Drizzle migration file is required.

**Rationale**: Direct schema.ts inspection.
**Alternatives considered**: Derive role from capabilities at runtime — rejected,
because the spec requires role to be user-declared at creation time and to filter
capability options.

---

## Decision 5 — Schema: `status` vs spec's validation status

**Decision**: The existing `status` column on `cms_connection` uses text values
that are **not** the spec's `unvalidated | valid | invalid` enumeration. The
existing code sets `status: 'draft'` on create/update. The `connectionValidations`
table stores per-task validation history.

**Implication**: The spec's `valid | unvalidated | invalid` maps to the existing
`status` field. The `upsertCmsConnection` action already resets status to `draft`
on every save — aligning with the spec's "reset to unvalidated on edit" requirement.
The `validateCmsConnection` action (already exists) updates this status after a
validation run. **The status column is already correct** — the values just need to
be normalised to `unvalidated | valid | invalid` in the Zod DTO and UI display,
which currently shows `draft`.

**Rationale**: `actions.ts` inspection — `status: 'draft'` on upsert, then
`validateCmsConnection` updates it based on task results.

---

## Decision 6 — Secret handling (credential masking and no pre-population)

**Decision**: The credential masking and no-pre-population requirements are
**already architecturally implemented**.

**Evidence**: `config.ts` defines `CMS_SECRET_FIELDS` per connector and
`SECRET_PLACEHOLDER = '__KEEP__'`. `actions.ts` `upsertCmsConnection` calls
`mergeSecrets()` which restores stored secrets when the incoming value is blank
or `__KEEP__`. The UI must send `__KEEP__` for masked fields rather than the
actual value. The stored encrypted config is never returned to the client — only
`cmsConnectionViewSchema` fields are returned (which excludes `configuration`).

**Implication**: NFR-007 (credential masking, no pre-population) is architecturally
solved. The implementation task is ensuring the UI form sends `__KEEP__` for
unmodified secret fields on edit, matching the existing server-side `mergeSecrets`
contract. This is a UI-side task, not a new server-side feature.

---

## Decision 7 — SSRF protection

**Decision**: The Strapi client uses `fetch` with user-supplied `serverUrl` without
any URL validation. No SSRF protection currently exists.

**Evidence**: `connectors/strapi/client.ts` — `strapiRequest` directly concatenates
`config.serverUrl` with the path and calls `fetch`. No allowlist or denylist check.

**Implication**: NFR-008 (SSRF protection) requires a new URL validation utility,
applied in each connector's client before any `fetch` call. This is new work.
The utility should reject: private IPv4 ranges (10.x, 172.16-31.x, 192.168.x),
loopback (127.x, ::1), link-local (169.254.x), and unresolvable hostnames.

**Approach**: A shared `validateEndpointUrl(url: string): void` function in
`src/lib/ssrf-guard.ts` (throws if disallowed). Called at the top of each
connector's validation and capability probe tasks before `fetch`.

---

## Decision 8 — Connection `role` UI: source/target designation

**Decision**: Role is declared on the **connection creation form** as a required
role selector. This aligns with US2/AC1 (updated in spec) and the existing
`cms_connection` schema which will receive a `role` column.

**Evidence**: The existing connection wizard UI at
`src/components/projects/content/` already renders a dynamic form driven by
the connector manifest. The role selector is a new field to add to this form,
placed at the top before the CMS type selector.

---

## Decision 9 — `dbUncached` for write-then-read

**Decision**: The existing `upsertCmsConnection` action calls `revalidatePath`
after write, but uses the cached `db` instance throughout. The list re-fetch
after save must use `dbUncached`.

**Evidence**: `actions.ts` line 216 — `revalidatePath(CONTENT_PATH, 'page')`.
The `getCmsConnections` action uses `db` (cached). After an upsert, the immediate
list refresh in the UI could return stale data.

**Implication**: `getCmsConnections` should use `dbUncached` when called in the
context of a post-write revalidation. Simplest approach: always use `dbUncached`
in `getCmsConnections` since connections per project are a small result set and
the query is fast.

---

## Decision 10 — Testing approach for connectors

**Decision**: Use **MSW (Mock Service Worker)** for connector unit tests. The
Contentful connector already has test files (`client.test.ts`, `discovery.test.ts`,
`mapper.test.ts`, `provision.test.ts`). Strapi has `client.test.ts`, `mapper.test.ts`,
`provision.test.ts`. The pattern is established.

**Implication**: FirstSpirit connector tests follow the same MSW pattern. No new
testing infrastructure is required.

**Rationale**: Existing test files in `connectors/contentful/` and
`connectors/strapi/` confirm the pattern.
**Alternatives considered**: Real integration tests against live instances — not
suitable for CI without live credentials.

---

## Summary of Unknowns Resolved

| Unknown | Resolution |
|---|---|
| Strapi connector status | Already fully implemented — only UI wiring needed |
| FirstSpirit connector status | Stubbed — new `client.ts` required |
| Schema `role` column | Missing — additive migration needed |
| Schema `status` values | Exists as `draft` — needs normalisation to `unvalidated/valid/invalid` |
| Credential handling | `SECRET_PLACEHOLDER` + `mergeSecrets` already implemented |
| SSRF protection | Not implemented — new `ssrf-guard.ts` utility needed |
| Role UI designation | New role selector field at top of connection form |
| `dbUncached` for list | Switch `getCmsConnections` to `dbUncached` |
| Connector testing | MSW pattern already established by Contentful/Strapi tests |
