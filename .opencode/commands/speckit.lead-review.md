---
description: Lead Developer review of spec.md — assesses architectural fit, reusable assets, data model impact, security, performance, and technical risks using full knowledge of the existing codebase architecture.
handoffs:
  - label: Cross Review
    agent: speckit.cross-review
    prompt: Run the cross review for this feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Assess `spec.md` from a technical leadership perspective. Answer: **Can we build this
correctly within the existing application?** Produce `reviews/lead-developer.md` using
`lead-review-template.md` as the output structure.

This review is **NOT** `/speckit.plan`. Do not produce a data model, API contracts,
file structure, or implementation tasks. Produce findings, risks, constraints, and
recommendations that will inform planning. The boundary is:

- Lead Review → *what to be careful about, what already exists, what could go wrong*
- `/speckit.plan` → *exactly what to build, how to structure it, which files to create*

## Prerequisites

Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse
JSON for `FEATURE_DIR`. Derive:

- `SPEC` = `FEATURE_DIR/spec.md`
- `PO_REVIEW` = `FEATURE_DIR/reviews/product-owner.md` (read if present)
- `UX_REVIEW` = `FEATURE_DIR/reviews/ui-ux.md` (read if present)
- `OUTPUT` = `FEATURE_DIR/reviews/lead-developer.md`
- `CONSTITUTION` = `.specify/memory/constitution.md`
- `REPO_ANALYSIS` = `.specify/memory/repository-analysis.md`
- `TEMPLATE` = `.specify/extensions/templates/lead-review-template.md`

If `spec.md` is missing, STOP: *"Run /speckit.specify first to create the feature spec."*

Create `FEATURE_DIR/reviews/` if it does not exist.

## Architecture Knowledge Base

Before assessing the spec, load and internalise the full architecture context:

**Read `repository-analysis.md` in its entirety.** This document is your architecture
knowledge base. It covers all 15 areas: application architecture, frontend architecture,
backend architecture, database/data model, major modules, reusable components, APIs,
auth/authorization, testing strategy, build/deployment, coding conventions, UI/design
system, important dependencies, technical debt, and areas to avoid or treat carefully.

**Read `constitution.md` in its entirety.** Pay particular attention to:
- Principle 7 — Data Layer and Schema Governance
- Principle 8 — Authentication and Authorisation Contracts
- Principle 9 — Testing Requirements
- Principle 13 — API Design and Versioning
- Principle 14 — Technical Debt Acknowledgements and Constraints (all 12 constraints)

With this knowledge, you can assess any feature without re-scanning the full codebase.
Use targeted codebase inspection only where the spec references a specific area that
requires verification beyond what the repository analysis documents.

## Execution

### 1. Load Inputs

Read all prerequisites listed above. Also read `reviews/product-owner.md` and
`reviews/ui-ux.md` if present — note any technical implications raised there.

### 2. Assess Architectural Fit

Map each functional requirement and user story in the spec to the existing architecture:
- Does it fit the Next.js App Router structure (Server Components, Server Actions,
  route groups `(session)` / `(iframe)` / `api/v1/`)?
- Does it respect the `ActionResponse<T>` pattern?
- Does it fit within the existing two-layer RBAC model, or does it require new
  permission concepts?
- Does it require any structural change to the application (new route group, new
  middleware, new top-level service)?

### 3. Identify Reusable Assets

Using repository-analysis.md section 5 (Major Modules) and section 6 (Reusable
Components) as reference, identify:
- Existing Server Actions that cover some of this feature's data needs
- Existing UI components that the UX would naturally use
- Existing API routes that can be extended rather than duplicated
- Existing Drizzle schema tables that are relevant

List these in the review — they directly constrain what `/speckit.plan` needs to design
from scratch vs. reuse.

### 4. Assess Data Model Impact

Using the schema knowledge from repository-analysis.md section 4:
- Does the feature require new tables? In which domain (`src/data/[domain]/schema.ts`)?
- Does it require changes to existing tables? Note migration risk.
- Does it interact with the AI schema (1028 lines, 29+ tables)?
- Does it interact with the CMS Blueprint graph (immutable per constitution P7)?
- Does it interact with the untyped `member.resource` pattern?
- Will a new Drizzle migration be required?

### 5. Assess API Surface Impact

- New `/api/v1/` routes needed? Breaking changes to existing ones?
- New Server Actions needed? Which domain?
- Any impact on the public CLI-facing endpoints (`/api/v1/publish`, `/api/v1/cli-auth`)?
- CORS implications for any new public endpoints?

### 6. Assess Security

Using constitution Principle 8 (Auth/RBAC) and Principle 5 (Security):
- Does the feature introduce new data access paths that need RBAC checks?
- Is there any risk of exposing data beyond the authenticated user's scope?
- Does it touch any of the auth-sensitive areas: NextAuth beta configuration,
  Keycloak token flow, `allowDangerousEmailAccountLinking`, API key validation?
- Any new external inputs that need validation (form data, URL params, uploaded files)?

### 7. Assess Performance

- Are there query patterns that risk N+1 problems with Drizzle ORM?
- Does the feature need Redis caching or does it interact with the db/dbUncached
  split (constitution P7 — write-then-read must use dbUncached)?
- Any client-side bundle size impact (new heavy dependencies)?
- Rate limiting implications for any new API endpoints?

### 8. Define Testing Implications

Per constitution Principle 9, map what testing is required:
- Jest + Testing Library: which Server Actions and business logic need unit coverage?
- Playwright E2E: which user flows need end-to-end coverage?
- Vitest: only if the feature touches `dialog-ui-*` packages

### 9. Identify Technical Risks

For each risk, assess Likelihood (H/M/L) and Impact (H/M/L). Provide a concrete
mitigation for any HIGH likelihood or HIGH impact risk.

### 10. Check Technical Debt Interactions (Principle 14 Checklist)

Explicitly check each of the 12 known constraints from constitution Principle 14:

1. `next-auth@5.0.0-beta.30` — does this feature touch auth configuration?
2. `@changesets/cli@3.0.0-next.5` — does this add publishable package changes?
3. `auth.config.ts debug: true` — does this feature handle sensitive token data?
4. Keycloak per-request introspection — does this add latency-sensitive paths?
5. `@webcomponent data-css-urls` attribute — does this touch Web Component rendering?
6. Unimplemented stubs — does this feature depend on mapping/provision/connectors?
7. AI schema (29+ tables) — does this add to the already complex AI domain?
8. Blueprint immutability — does this touch `cms_blueprint_*` tables?
9. `src/proxy.ts` Edge Runtime — does this need middleware changes?
10. Storage backend — does this add new asset storage needs?
11. Cross-Origin headers / WebContainer — does this affect global security headers?
12. `db` vs `dbUncached` — are there write-then-read patterns?
13. `member.resource` no FK — does this use the member permission system?
14. `workspace:*` publishing — does this affect published packages?

For each constraint that applies, note the interaction. For those that do not apply,
a single line "Not applicable" is sufficient.

### 11. Write Output

Copy `lead-review-template.md` to `OUTPUT` and fill every section with concrete
findings. Replace all placeholder tokens. Do not leave template comments in the
output. Set the **Verdict** to one of:

- **APPROVED** — feature is technically sound, ready for cross-review and planning
- **NEEDS REVISION** — spec changes needed before planning can produce a clean plan
- **BLOCKED** — a hard technical blocker exists (e.g., depends on an unimplemented
  stub, requires architectural changes outside this feature's scope)

## Constraints

- Do NOT produce a data model, API contracts, file tree, or task list
- Do NOT modify `spec.md` or any other review file
- "Recommended Plan Constraints" MUST be constraints (things to avoid or require),
  not decisions (specific files to create or patterns to use)
- Codebase inspection MUST be bounded to areas referenced by the spec — do not
  perform a broad audit of the entire codebase

## Completion Report

Report to the user:
- Output file path
- Verdict
- Count of technical risks (by severity)
- Principle 14 constraints that apply to this feature
- Suggested next step: `/speckit.cross-review`
