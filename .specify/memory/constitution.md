<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1
Bump type: PATCH — added review artefact lifecycle governance paragraph under
  Governance section; no principles added, removed, or redefined.
Modified principles: none
Added sections:
  - Governance: Review Artefact Lifecycle (new subsection)
Removed sections: none
Deferred TODOs:
  - TODO(RATIFICATION_DATE): still unknown; retained from v1.0.0.

Previous report (1.0.0 → 1.1.0):
  Added principles 7–14; Overview expanded with workspace layout, package
  relationships, and turbo pipeline.
-->

# Project Constitution — Ethereal Nexus

**Version:** 1.1.1
**Ratification date:** TODO(RATIFICATION_DATE): confirm with core team (approx. 2024-01-01)
**Last amended:** 2026-08-10
**License:** Apache-2.0

---

## Overview

Ethereal Nexus is an open-source micro-frontend integration toolkit that enables frontend
developers to build UI components with modern frameworks (React, Vue, Angular, etc.) and
consume them inside any Content Management System without coupling component authorship to
CMS internals.

The project is organised as a **pnpm + Turborepo v2 monorepo**:

| Workspace | Location | Purpose |
|-----------|----------|---------|
| SDK libraries | `lib/` | `core`, `react`, `cli`, `vite-plugin` — published npm packages |
| Web applications | `web/` | `dashboard` (Next.js 16 App Router), `site` (Astro docs), `az-serve-static-assets-fn` |
| Dialog UI renderers | `dialog-ui/` | `dialog-ui-core` (headless), `dialog-ui-shadcn`, `dialog-ui-spectrum` — published |
| Tests | `test/` | `e2e/` (Playwright), `load/` |
| Examples | `examples/` | Consumer demo projects |

**Internal dependency graph (workspace protocol):**
- `dialog-ui-shadcn` → `dialog-ui-core`
- `lib/vite-plugin` → `lib/core`
- `web/dashboard` → `dialog-ui-core` and `dialog-ui-shadcn` (versioned semver)

**Turbo pipeline:**

| Task | Dep | Outputs cached |
|------|-----|----------------|
| `build` | `^build` | `.next/**`, `.astro/**`, `.dist/**` |
| `publish` | `build` | — (no cache) |

The root `postinstall` hook automatically builds all `lib/*` packages so workspace consumers
always have fresh builds after `pnpm install`.

This constitution records the non-negotiable engineering and governance principles that guide
every contribution to the project.

---

## Principles

### Principle 1 — Framework Agnosticism

Components MUST be authored without a hard dependency on any specific CMS or host
framework. Integration adapters (e.g., `@ethereal-nexus/react`) MAY wrap framework
primitives, but the `@ethereal-nexus/core` schema API MUST remain framework-neutral.

**Rationale:** The primary value proposition of Ethereal Nexus is CMS-agnostic
micro-frontend composition. Leaking CMS or framework assumptions into core APIs would
erode this guarantee and force consumers into lock-in.

---

### Principle 2 — Schema-First Component Contracts

Every remotely consumable component MUST declare its props through the `dialog()` schema
DSL exported by `@ethereal-nexus/core`. Implicit or untyped prop surfaces are not
permitted in published components.

**Rationale:** A machine-readable schema is the contract between the component author
and the CMS authoring UI. Without it, tooling (dialog generation, type inference, CLI
scaffolding) cannot function reliably.

---

### Principle 3 — Monorepo Integrity

All packages MUST be managed through the pnpm workspace and built via Turborepo pipelines
defined in `turbo.json`. Direct cross-package imports outside the workspace protocol are
forbidden. Dependency overrides in the root `package.json` MUST be justified by a
documented security or compatibility reason.

**Rationale:** A consistent build graph prevents subtle version skew, ensures cache
correctness, and keeps CI reproducible across contributors and environments.

---

### Principle 4 — Trunk-Based Development

The canonical branch is `main`. All changes MUST arrive via a short-lived feature branch
and a pull request. Direct commits to `main` are not permitted. Feature branches MUST be
rebased or merged against a recent `main` before opening a PR.

**Rationale:** Trunk-based development minimises integration debt and keeps the deployment
pipeline simple (merge → deploy to dev → release).

---

### Principle 5 — Security-First Dependency Management

Dependencies MUST be kept free of known high or critical CVEs. The pnpm `overrides` field
in the root `package.json` is the approved mechanism for patching transitive
vulnerabilities while upstream fixes are pending. Every override MUST include a comment
referencing the CVE or issue being mitigated.

**Rationale:** Ethereal Nexus packages are consumed by third-party projects. Shipping
vulnerable transitive dependencies exposes the entire downstream ecosystem.

---

### Principle 6 — Open Contribution and Documentation

All public APIs MUST be documented before a package version is published. The project
documentation site (`web/site`) MUST be updated in the same PR as any breaking or
user-visible API change. Contributors MUST follow the process described in
`CONTRIBUTING.md`.

**Rationale:** An open-source project's health depends on contributors being able to
understand and extend it without requiring direct help from the core team.

---

### Principle 7 — Data Layer and Schema Governance

All database access MUST go through **Drizzle ORM**. Raw SQL is only permitted inside
Drizzle migration files (`drizzle/*.sql`). Schema definitions live one-per-domain in
`src/data/**/schema.ts` files discovered by the drizzle-kit glob.

Schema change rules:
- `db:generate` MUST be run to produce a migration file; `db:push` is allowed in local
  development only and MUST NOT be used in production.
- The **CMS Blueprint domain** (`cms_blueprint_*` tables) is immutable by design. It MUST
  never store Nexus IDs, mappings, or generated component data. Mapping and provision
  concerns belong to `src/data/meta/mapping/` and `src/data/meta/provision/` respectively.
- The `member.resource` column is an intentionally untyped UUID (no FK constraint) that
  may reference a project, environment, or component. Code that resolves permissions MUST
  verify that the referenced resource still exists before acting on it.
- Write-then-read patterns MUST use the `dbUncached` instance to avoid reading stale
  cached data from the `db` (cached) instance.

**Rationale:** Schema drift and cross-domain coupling are the primary sources of data
integrity failures in this architecture. Strict domain isolation and migration discipline
prevent both.

---

### Principle 8 — Authentication and Authorisation Contracts

Authentication is provided by **NextAuth.js v5** (`next-auth@5.0.0-beta.30`). The
following rules apply until a stable release supersedes this principle:

- Auth configuration lives exclusively in `src/auth.config.ts` and
  `src/auth.ts`. No other file may import or re-instantiate `NextAuth`.
- The Next.js Edge middleware (`src/proxy.ts`) is the sole authentication gate for
  non-API routes. It MUST NOT import Node.js-only modules (Edge Runtime constraint).
- The RBAC model has two layers:
  1. Global user role on `user.role`: `admin` (always write), `viewer` (always read),
     `user` (resolved from `member` table).
  2. Per-resource permission on `member.permissions`: `none | read | write | manage`.
- API routes under `/api/v1/` MUST authenticate via `authenticatedWithApiKeyUser()` in
  `src/app/api/utils.ts`, which accepts `APIKey <uuid>` or `Bearer <jwt>` tokens.
- `allowDangerousEmailAccountLinking: true` is intentionally set on Entra ID and Keycloak
  providers. This MUST NOT be removed without a security review.

**Rationale:** Auth is the project's highest-risk dependency because it is beta software.
Centralising all auth logic limits the blast radius of upstream breaking changes.

---

### Principle 9 — Testing Requirements

All new features MUST include tests at the appropriate level:

| Layer | Tool | Location | Minimum expectation |
|-------|------|----------|---------------------|
| Unit/integration | Jest + Testing Library | `web/dashboard/` | Business logic in `actions.ts` and utilities |
| E2E | Playwright (Page Object Model) | `test/e2e/` | Happy path + key failure paths for user-facing flows |
| dialog-ui | Vitest | `dialog-ui/*/` | All public hook and processor behaviours |

Published SDK packages (`lib/core`, `lib/react`, `lib/vite-plugin`) currently have zero
test coverage. Any PR that modifies these packages MUST add or update unit tests. New
features in these packages MUST NOT be merged without tests.

**Rationale:** The SDK libraries are the highest-leverage code in the repository. Bugs
there affect every downstream consumer. The absence of tests is an acknowledged debt item,
not a permitted baseline.

---

### Principle 10 — Build, Deployment and Release Process

- **Docker:** The dashboard is built and deployed as a Docker image using the three-stage
  `web/dashboard/Dockerfile` (deps → builder → minimal runner). The runner stage uses a
  non-root `nextjs` user. Do not add `RUN` steps that require root in the runner stage.
- **Redis:** The rate-limiting and DB-cache layer requires Redis (configured via
  `REDIS_URL`). If Redis is unavailable, the system falls back to in-memory caches. This
  fallback is per-instance and MUST NOT be relied upon in multi-instance production
  deployments.
- **Asset storage:** Component bundles are stored in cloud object storage. The provider is
  controlled by `STORAGE_TYPE` (Azure Blob or Google Cloud Storage). Switching providers
  requires migrating all existing asset URLs before deployment; a storage migration plan
  MUST be produced before any provider change.
- **Library releases:** Version management uses Changesets (`@changesets/cli`). All `lib/*`
  and `dialog-ui/*` packages MUST have a changeset entry before merging a PR that changes
  public API. `workspace:*` dependencies are replaced by pnpm with concrete versions at
  publish time — dependent packages MUST be bumped in sync.
- **Cross-origin headers:** `Cross-Origin-Embedder-Policy: require-corp` and
  `Cross-Origin-Opener-Policy: same-origin` are set globally. These are required by the
  WebContainer API (AI component generator). They MUST NOT be removed or scoped to
  specific routes without a full refactor of the WebContainer integration.

**Rationale:** Deployment and release integrity are non-negotiable once external consumers
depend on published packages and running infrastructure.

---

### Principle 11 — UI and Design System Consistency

- All dashboard UI components MUST use the locally-owned **shadcn/ui** "new-york" style
  primitives located in `src/components/ui/`. These are plain TypeScript files that can
  be freely modified — they are not managed by the shadcn CLI after initial generation.
- Styling MUST use **Tailwind CSS v4** utility classes and the CSS custom-property design
  tokens defined in `src/app/globals.css`. Hard-coded colour values or inline style
  objects are not permitted except for dynamically computed values that cannot be expressed
  as utility classes.
- Class composition MUST use `tailwind-merge` (via the `cn()` helper) and
  `class-variance-authority` (CVA) for variant-driven components.
- Icons MUST be sourced from **Lucide React** as the primary library.
- The `dialog-ui-shadcn` package has **Storybook** stories. Any change to a dialog field
  renderer SHOULD include a story update.

**Rationale:** Visual and interaction consistency across the dashboard is enforced at the
component level. Diverging styling approaches create maintenance debt that compounds with
every new contributor.

---

### Principle 12 — Observability and Logging

- **OpenTelemetry** is the single instrumentation standard. OTEL is bootstrapped via
  `@vercel/otel` in `src/instrumentation.ts`. New spans and metrics MUST use the OTEL API;
  custom tracing solutions are not permitted.
- The `/api/logs` route is explicitly excluded from OTEL tracing to prevent log-ingestion
  loops.
- All structured logging MUST use the project's `Logger` abstraction (`src/lib/logger.ts`).
  Direct use of `console.log` in production code paths is not permitted. The coexistence
  of `pino` and `winston` in `package.json` is a known debt item; new code MUST use the
  `Logger` abstraction only and MUST NOT import either logger directly.
- `web-vitals` is instrumented via `WebVitalsProvider` in the root layout. Core Web Vitals
  reporting MUST NOT be removed.

**Rationale:** Operational visibility is critical for a platform that runs user-facing
components in third-party CMSes. Consistent instrumentation ensures problems are
diagnosable in production.

---

### Principle 13 — API Design and Versioning

- All externally facing endpoints MUST be placed under `/api/v1/`. Internal background-job
  endpoints live under `/api/internal/` and MUST NOT be called from external clients.
- API responses MUST use the `HttpStatus` enum from `src/app/api/utils.ts`. Magic HTTP
  status numbers in route handlers are not permitted.
- Breaking changes to `/api/v1/` endpoints MUST be introduced under a new version prefix
  (`/api/v2/`) and the old endpoint MUST be deprecated with a documented sunset date before
  removal.
- CORS is currently set to `Access-Control-Allow-Origin: *` globally. New endpoints that
  handle sensitive operations SHOULD restrict this to known origins.

**Rationale:** The v1 API is consumed by the CLI and by third-party CMS integrations.
Unversioned breaking changes would silently break deployments outside our control.

---

### Principle 14 — Technical Debt Acknowledgements and Constraints

The following are **known constraints** that contributors MUST be aware of. They are not
bugs to be fixed opportunistically — changes require deliberate planning:

1. **`next-auth@5.0.0-beta.30`** — The auth library is beta. API changes are possible.
   Any auth-adjacent PR MUST test all five provider flows end-to-end.
2. **`@changesets/cli@3.0.0-next.5`** — The release tool is pre-release. Monitor for
   breaking changes before running `pnpm release`.
3. **`auth.config.ts` `debug: true`** — Verbose NextAuth debugging is always enabled.
   This leaks token details to server logs. It MUST be made environment-conditional before
   the project's first production launch.
4. **Keycloak token introspection on every request** — The JWT callback contacts the
   Keycloak OIDC endpoint on every authenticated request. If Keycloak is unreachable and
   the token is expired, the session is invalidated. Resilience improvements require changes
   to the JWT callback strategy.
5. **`@webcomponent` decorator `data-css-urls` attribute** — The attribute name and JSON
   array format used to inject shadow-DOM stylesheets is load-bearing for all deployed Web
   Components. It MUST NOT be renamed or restructured without a coordinated migration plan.
6. **Unimplemented stubs** — The following areas have UI or schema scaffolding but no
   working implementation: `meta/mapping/`, `meta/provision/`, Strapi connector (network
   calls), FirstSpirit connector (network calls), Migration Jobs, Export/Import/Publish
   pipeline, scheduled re-discovery, snapshot history UI, and the AI semantic layer. PRs
   MUST NOT ship UI that implies these features are functional.

**Rationale:** Surfacing constraints in the constitution ensures they are visible during
planning, not discovered mid-implementation.

---

## Governance

### Amendment Procedure

1. Any contributor may propose a constitution amendment by opening a pull request that
   modifies `.specify/memory/constitution.md`.
2. Amendments require approval from at least one core-team maintainer.
3. The `CONSTITUTION_VERSION` MUST be incremented following semver semantics:
   - **MAJOR** — removal or incompatible redefinition of an existing principle.
   - **MINOR** — addition of a new principle or materially expanded guidance.
   - **PATCH** — clarification, wording fix, or non-semantic refinement.
4. `LAST_AMENDED_DATE` MUST be updated to the merge date (ISO 8601: `YYYY-MM-DD`).

### Versioning Policy

The constitution version is independent of package versions. It tracks governance
evolution only and MUST NOT be coupled to npm release cycles.

### Review Artefact Lifecycle

The multi-agent review phase produces four artefacts per feature:
`reviews/product-owner.md`, `reviews/ui-ux.md`, `reviews/lead-developer.md`, and
`reviews/cross-review.md`. These are first-class project knowledge.

- Review artefacts MUST be committed to the repository alongside `spec.md`.
- Review artefacts MUST NOT be deleted or overwritten after planning begins.
  They are the rationale record for decisions made before implementation.
- `/speckit.plan` MUST read available review artefacts before producing the
  implementation plan. Constraints recorded in `reviews/lead-developer.md`
  ("Recommended Plan Constraints") are binding inputs to planning.
- Conflicts recorded in `reviews/cross-review.md` MUST be resolved with a
  documented human decision before `/speckit.plan` proceeds.
- The spec template override at `.specify/templates/overrides/spec-template.md`
  and the review templates at `.specify/extensions/templates/` are project-owned
  customisations. They are not tracked by Spec Kit's update mechanism and MUST
  NOT be deleted by a `speckit update` run.

### Compliance Review

The core team SHOULD review this constitution at least once per calendar quarter and after
any major architectural change to the project. Non-compliant code patterns identified
during review MUST be tracked as issues and resolved within the next minor release cycle.
