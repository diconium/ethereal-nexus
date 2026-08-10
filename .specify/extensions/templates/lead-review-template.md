# Lead Developer Review: [FEATURE NAME]

**Feature**: [link to spec.md]
**Reviewer**: Lead Developer Agent
**Created**: [DATE]
**Status**: Draft

## Verdict

<!--
  Overall technical assessment.
  Choose one: APPROVED | NEEDS REVISION | BLOCKED
  BLOCKED means a technical blocker exists that prevents planning from starting.
-->

**[APPROVED / NEEDS REVISION / BLOCKED]** — [One sentence summary of the verdict]

## Architectural Fit

<!--
  This project is a Next.js 16 App Router application using:
  - Server Actions ('use server') as the data layer pattern
  - Drizzle ORM + PostgreSQL for persistence
  - TanStack Query v5 for client-side server state
  - NextAuth.js v5 beta for authentication
  - shadcn/ui + Tailwind CSS v4 for UI
  - Two-layer RBAC (user.role + member.permissions)

  Assess whether the feature fits this architecture without requiring
  structural changes. Flag any deviations.
-->

**Fits existing architecture**: [Yes / With caveats / No — explanation]

[Detailed architectural assessment. Note if the feature aligns with Server Actions
pattern, existing auth/RBAC model, Drizzle schema conventions, and App Router
route group structure `(session)` / `(iframe)` / `api/v1/`.]

## Reusable Assets Identified

<!--
  What existing code can be leveraged for this feature?
  Reference the repository analysis for components, hooks, actions, and utilities.
-->

| Asset Type | Name / Location | How It Applies |
|------------|-----------------|----------------|
| Server Action | `src/data/[domain]/actions.ts` | [usage] |
| UI Component | `src/components/ui/[name]` | [usage] |
| API Route | `src/app/api/v1/[route]` | [usage] |
| Schema | `src/data/[domain]/schema.ts` | [usage] |
| Hook / Utility | [location] | [usage] |

*If none: "No significant reuse opportunities identified — this is net-new surface."*

## Data Model Impact

<!--
  Does this feature require new tables, schema changes, or migrations?
  Assess risk using Drizzle ORM conventions (schema.ts per domain, drizzle-kit migrations).
  Flag if the feature would touch the AI schema (29+ tables) or CMS Blueprint graph
  (immutable by constitution Principle 7).
-->

**Schema changes required**: [Yes / No / Likely]

[Description of data model impact. New tables, modified columns, new relations,
migration complexity. Flag if this touches the AI schema, Blueprint domain, or
the untyped `member.resource` FK pattern.]

## API Surface Impact

<!--
  New /api/v1/ routes? New Server Actions? Changes to existing endpoints?
  Flag any breaking changes to the public SDK-facing API.
-->

**New routes required**: [Yes / No]

**Existing routes modified**: [Yes / No — if yes, flag breaking change risk]

[Description of API changes. Note any impact on the CLI (`/api/v1/publish`,
`/api/v1/cli-auth`) or on routes consumed by external CMS integrations.]

## Security Considerations

<!--
  Assess against constitution Principles 5 and 8.
  Check: RBAC implications, input validation, data scoping, auth boundaries.
  Flag any of the 12 "areas to treat carefully" from Principle 14.
-->

**RBAC impact**: [Existing roles/permissions sufficient / New permissions needed / No auth impact]

[Security assessment. Note any data that could be exposed beyond the authenticated
user's scope, any new attack surface introduced, and whether the feature touches
known sensitive areas: NextAuth beta, Keycloak token flow, CORS configuration,
`allowDangerousEmailAccountLinking`.]

## Performance Considerations

<!--
  Assess query patterns, caching needs, bundle size impact, and rate limiting.
  Flag if the feature touches the dual db/dbUncached pattern or Redis rate limiting.
-->

[Performance assessment. Note any N+1 query risks, large result sets without
pagination, client bundle size additions, or need for Redis caching.]

## Testing Implications

<!--
  What testing is required per constitution Principle 9?
  Map to the three layers: Jest (dashboard), Playwright (e2e), Vitest (dialog-ui).
-->

| Layer | Required | Scope |
|-------|----------|-------|
| Jest + Testing Library | Yes / No | [what to test] |
| Playwright E2E | Yes / No | [user flows to cover] |
| Vitest (dialog-ui) | Yes / No | [if dialog-ui is touched] |

## Technical Risks

<!--
  What could go wrong? Rate likelihood and impact.
  Give a concrete mitigation for each HIGH risk.
-->

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [risk description] | High / Med / Low | High / Med / Low | [mitigation] |

*If none: "No significant technical risks identified."*

## Technical Debt Interactions

<!--
  Does this feature interact with any of the 14 known constraint areas from
  constitution Principle 14? Check each explicitly:
  1. next-auth beta  2. @changesets pre-release  3. auth debug:true
  4. Keycloak per-request introspection  5. @webcomponent data-css-urls
  6. Unimplemented stubs (mapping, provision, connectors, migration jobs)
  7. AI schema (29+ tables)  8. Blueprint immutability  9. proxy.ts Edge Runtime
  10. Storage backend  11. Cross-Origin headers / WebContainer
  12. db vs dbUncached  13. member.resource no FK  14. workspace:* publishing
-->

[Explicit check of each relevant constraint. For each that applies, note the
interaction and any extra care required. For constraints that do not apply,
a single "Not applicable" line is sufficient.]

## Recommended Plan Constraints

<!--
  Things /speckit.plan MUST respect when making implementation decisions.
  These are constraints, not decisions. Do not specify which files to create,
  which React components to use, or how to structure the code.
  /speckit.plan makes those decisions — informed by these constraints.
-->

1. [Constraint — e.g., "MUST reuse existing RBAC check pattern from `src/data/member/`"]
2. [Constraint — e.g., "MUST NOT modify CMS Blueprint tables"]
3. [Constraint — e.g., "MUST add a Drizzle migration — direct db:push is not acceptable"]

*If none: "No specific constraints beyond standard constitution compliance."*

## Recommended Spec Changes

<!--
  Technical corrections needed in the spec before planning can proceed.
  Focus on feasibility and correctness, not implementation preference.
  If verdict is APPROVED, write "None — spec is technically sound."
-->

1. [Change description]
2. [Change description]
