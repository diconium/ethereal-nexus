---
description: UI/UX review of spec.md — assesses user flows, design system alignment, state coverage, accessibility, and interaction design before planning begins.
handoffs:
  - label: Lead Developer Review
    agent: speckit.lead-review
    prompt: Run the Lead Developer review for this feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Assess `spec.md` from a user experience perspective. Answer: **Is this the right user
experience?** Produce `reviews/ui-ux.md` using `ux-review-template.md` as the output
structure. This review is implementation-agnostic — do NOT dictate which React
components to use, which shadcn primitives to choose, or how to structure the code.
Assess the experience quality, not the technical realisation.

## Prerequisites

Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse
JSON for `FEATURE_DIR`. Derive:

- `SPEC` = `FEATURE_DIR/spec.md`
- `PO_REVIEW` = `FEATURE_DIR/reviews/product-owner.md` (optional — read if present)
- `OUTPUT` = `FEATURE_DIR/reviews/ui-ux.md`
- `CONSTITUTION` = `.specify/memory/constitution.md`
- `REPO_ANALYSIS` = `.specify/memory/repository-analysis.md`
- `TEMPLATE` = `.specify/extensions/templates/ux-review-template.md`

If `spec.md` is missing, STOP: *"Run /speckit.specify first to create the feature spec."*

Create `FEATURE_DIR/reviews/` if it does not exist.

## Execution

### 1. Load Inputs

Read:
- `spec.md` in full
- `constitution.md` — focus on Principle 11 (UI and Design System Consistency)
- `repository-analysis.md` — sections 6 (Reusable Components) and 12 (UI/Design System)
- `reviews/product-owner.md` if present — note any PO positions that affect UX

### 2. Assess User Flows

Walk through each user story as if you were the user:
- Are all steps in the flow accounted for in the spec?
- Are there navigation dead ends, missing confirmation steps, or unclear transitions?
- Does the flow match how users in this type of application typically behave?

### 3. Assess Design System Alignment

Using the repository analysis (section 6 and 12) as ground truth:
- Does the spec's implied experience align with the existing shadcn/ui "new-york" style?
- Are there existing components in `src/components/ui/` that already cover this feature?
- Does the spec introduce UI patterns that would be inconsistent with existing ones?

Do NOT recommend specific component names or file paths — that is planning's job.
Identify whether existing patterns are sufficient or genuinely new ones are required.

### 4. Assess States Coverage

For every interactive element or async operation in the spec, check whether these
states are addressed (explicitly or implicitly):
- **Loading** — while data is being fetched or an action is in progress
- **Empty** — when there is no data to display
- **Error** — when an operation fails or data is unavailable
- **Success / Confirmation** — when an action completes
- **Disabled / Read-only** — when a user lacks permission or the state is inactive
- **Partial / In-progress** — for multi-step flows

Mark each as: Addressed (spec explicitly covers it), Implied (reasonable to assume),
or Missing (must be added to the spec).

### 5. Assess Accessibility

Using WCAG 2.1 AA as the baseline (per constitution Principle 11):
- Does any described flow create barriers for keyboard navigation?
- Are there colour or contrast decisions implied by the spec?
- Does the feature involve custom interactions (drag, modal, multi-select) that
  need explicit accessibility treatment?

### 6. Assess Responsive Behaviour

- Does the spec make layout assumptions that only work at certain breakpoints?
- Are there interactions (hover, drag, complex tables) that need mobile alternatives?

### 7. Assess Interaction Design

- Are feedback moments accounted for? (async action started, completed, failed)
- Are destructive actions protected with confirmation?
- Is inline validation described for form inputs?
- Are toast notifications or inline alerts needed for key outcomes?

### 8. Identify Conflicts with PO Review

If `reviews/product-owner.md` is present, compare UX positions against PO positions.
Note any conflicts — do NOT resolve them, surface them for cross-review.

### 9. Write Output

Copy `ux-review-template.md` to `OUTPUT` and fill every section with concrete
findings. Replace all placeholder tokens. Do not leave template comments in the
output. Set the **Verdict** to one of:

- **APPROVED** — UX is adequately specified, ready for Lead review
- **NEEDS REVISION** — specific UX changes listed in "Recommended Spec Changes"
- **REJECTED** — fundamental UX problem that makes the spec unworkable as described

## Constraints

- Do NOT name specific React components, file paths, or CSS classes
- Do NOT redefine business requirements — suggest additions, not replacements
- Do NOT modify `spec.md` or `reviews/product-owner.md`
- Reference existing design system patterns by category (e.g., "existing data table
  pattern"), not by implementation (e.g., "use DataTable component from ui/")

## Completion Report

Report to the user:
- Output file path
- Verdict
- States requiring spec additions (if any)
- Conflicts with PO review (if any)
- Suggested next step: `/speckit.lead-review`
