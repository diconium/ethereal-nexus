# UI/UX Review: [FEATURE NAME]

**Feature**: [link to spec.md]
**Reviewer**: UI/UX Agent
**Created**: [DATE]
**Status**: Draft

## Verdict

<!--
  Overall assessment from a user experience perspective.
  Choose one: APPROVED | NEEDS REVISION | REJECTED
-->

**[APPROVED / NEEDS REVISION / REJECTED]** — [One sentence summary of the verdict]

## User Flow Assessment

<!--
  Are the user flows described in the spec complete and logical?
  Walk through each story step by step and identify missing transitions,
  dead ends, or confusing sequences.
-->

[Assessment of flow completeness. Note any missing steps, unclear navigation paths,
or flows that contradict how users typically behave in this type of interface.]

## Design System Alignment

<!--
  This project uses shadcn/ui (new-york style), Tailwind CSS v4, Radix UI primitives,
  and Lucide React icons. Assess whether the spec is compatible with these existing
  patterns. Reference the repository analysis for existing reusable components.
-->

**Compatible with existing patterns**: [Yes / Partially / No — explanation]

**Existing components that cover this feature**: [list relevant components from
`src/components/ui/` or domain components, or "None identified"]

**New UI patterns required**: [list genuinely new patterns needed, or "None"]

## States Coverage

<!--
  Every interactive feature must account for all relevant states.
  Mark each one as Addressed (spec covers it), Implied (reasonable to infer),
  or Missing (not covered and must be added).
-->

| State | Status | Notes |
|-------|--------|-------|
| Loading | Addressed / Implied / Missing | |
| Empty | Addressed / Implied / Missing | |
| Error | Addressed / Implied / Missing | |
| Success / Confirmation | Addressed / Implied / Missing | |
| Disabled / Read-only | Addressed / Implied / Missing | |
| Partial / In-progress | Addressed / Implied / Missing | |

## Accessibility

<!--
  Assess against WCAG 2.1 AA as the baseline (per project constitution Principle 11).
  Identify any spec requirements that would create accessibility barriers.
-->

[Accessibility assessment. Flag any flows or components that would require
non-standard accessibility work or that risk failing WCAG 2.1 AA.]

## Responsive Behaviour

<!--
  This is a Next.js web application used across desktop and mobile breakpoints.
  Does the spec make assumptions that only work at certain screen sizes?
-->

[Assessment of responsive considerations. Note any layouts or interactions that
need explicit mobile/tablet treatment — or confirm the spec is layout-agnostic.]

## Interaction Design

<!--
  Are feedback mechanisms, micro-interactions, and transition states accounted for?
  E.g., optimistic updates, confirmation dialogs, inline validation, toast notifications.
-->

[Assessment of interaction quality. Note missing feedback moments — e.g., no
confirmation for destructive actions, no loading feedback on async operations.]

## Conflicts with Product Owner Review

<!--
  If product-owner.md is available, note any UX positions that conflict with
  PO decisions. Do NOT resolve them here — surface them for cross-review.
-->

[Conflicts with PO review — or "No conflicts identified / PO review not yet available."]

## Recommended Spec Changes

<!--
  Specific UX improvements needed before APPROVED.
  Focus on user experience quality, not implementation details.
  If verdict is APPROVED, write "None — UX is adequately specified."
-->

1. [Change description]
2. [Change description]
