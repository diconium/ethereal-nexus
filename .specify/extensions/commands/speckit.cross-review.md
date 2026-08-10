---
description: Cross-cutting review — reads all three specialist reviews, identifies conflicts between perspectives, reinforces agreements, and produces a human-decision list before planning proceeds.
handoffs:
  - label: Create Technical Plan
    agent: speckit.plan
    prompt: Create the implementation plan for this feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Synthesise the three specialist reviews into a single cross-review. Answer:
**Do the three perspectives agree? Where do they conflict?** Produce
`reviews/cross-review.md` using `cross-review-template.md` as the output structure.

This command does **NOT** resolve conflicts — it surfaces them with options for the
human to decide. It does **NOT** modify `spec.md` or any review file.

After this command, a human reviews `cross-review.md`, resolves any open decisions,
and approves or requests revision before `/speckit.plan` proceeds.

## Prerequisites

Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse
JSON for `FEATURE_DIR`. Derive:

- `SPEC` = `FEATURE_DIR/spec.md`
- `PO_REVIEW` = `FEATURE_DIR/reviews/product-owner.md`
- `UX_REVIEW` = `FEATURE_DIR/reviews/ui-ux.md`
- `LEAD_REVIEW` = `FEATURE_DIR/reviews/lead-developer.md`
- `OUTPUT` = `FEATURE_DIR/reviews/cross-review.md`
- `CONSTITUTION` = `.specify/memory/constitution.md`
- `TEMPLATE` = `.specify/extensions/templates/cross-review-template.md`

**All three review files are required.** If any is missing, STOP with:
*"Missing: [file]. Run /speckit.[po-review|ux-review|lead-review] first."*

## Execution

### 1. Load All Inputs

Read `spec.md`, all three review files, and `constitution.md` in full.

### 2. Collect All Verdicts

Note the verdict from each review (APPROVED / NEEDS REVISION / REJECTED / BLOCKED).
If any verdict is BLOCKED or REJECTED, the overall readiness is immediately BLOCKED —
still complete the full analysis so the human has context for what needs fixing.

### 3. Identify Conflicts

A conflict exists when:
- Two reviews take incompatible positions on the same topic (Direct conflict)
- Two reviews' combined requirements would be infeasible together (Implicit conflict)
- Reviews disagree on feature scope — one includes something the other explicitly
  excludes (Scope conflict)

For each conflict:
- Quote the relevant position from each review
- State why they are incompatible
- Provide at least two concrete resolution options with their trade-offs
- Do NOT choose an option — that is the human's decision

Common conflict patterns to look for:
- PO requires a capability that Lead flags as technically blocked or out of scope
- UX requires a real-time or optimistic update that Lead says the architecture
  does not support without significant new infrastructure
- PO scopes the feature one way; UX or Lead implies a different scope through
  their recommendations
- Lead recommends a spec change that would remove a user story the PO approved
- UX requires states (loading, error, empty) that the PO's acceptance criteria
  do not mention and the Lead flags as non-trivial to implement

### 4. Aggregate Spec Change Recommendations

Collect all "Recommended Spec Changes" from the three reviews. For each:
- Note which review(s) requested it
- Flag if two reviews request contradictory changes to the same spec section

### 5. Identify Agreements

Find points where two or more reviews independently reached the same conclusion.
These are high-confidence inputs — `/speckit.plan` should treat them as settled.

Examples: both PO and Lead flag rate limiting; both UX and Lead flag that a
specific flow is more complex than the spec implies; all three agree scope is
correctly bounded.

### 6. Compile Open Decisions

List every decision that requires human input before planning can proceed.
Format each as a concrete choice with options, not an open question.

Only include decisions that:
- Arise from a genuine conflict between reviews
- Have a material impact on feature scope, architecture, or user experience
- Cannot be reasonably defaulted

### 7. Write Synthesis for Planning

Write a brief forward-looking paragraph addressed to `/speckit.plan`. Assume all
open decisions will be resolved and write what the planner needs to know:
- Settled constraints from the Lead review
- Non-negotiable UX requirements from the UX review
- Scope boundaries confirmed by the PO review
- Anything all three reviews agreed on

Use `[PENDING: Decision #N]` as a placeholder for unresolved decisions.

### 8. Write Output

Copy `cross-review-template.md` to `OUTPUT` and fill every section. Replace all
placeholder tokens. Do not leave template comments in the output.

Set **Overall Readiness** to:
- **READY FOR PLANNING** — all verdicts APPROVED, no unresolved conflicts
- **CONFLICTS REQUIRE RESOLUTION** — one or more conflicts need human decision
- **BLOCKED** — a BLOCKED or REJECTED verdict exists

## Constraints

- Do NOT resolve conflicts — present options only
- Do NOT modify `spec.md` or any review file
- Do NOT access the application codebase (all needed context is in the reviews)
- Maximum 5 open decisions — if more exist, group related ones

## Completion Report

Report to the user:
- Output file path
- Overall readiness status
- Count of conflicts identified
- Count of open decisions requiring human input
- Next step:
  - If READY FOR PLANNING: *"Review cross-review.md and run /speckit.plan when ready."*
  - If CONFLICTS REQUIRE RESOLUTION: *"Review open decisions in cross-review.md,
    resolve them (update spec.md as needed), then run /speckit.plan."*
  - If BLOCKED: *"Address the BLOCKED verdict in [file] before proceeding."*
