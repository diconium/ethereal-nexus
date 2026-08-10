---
description: Product Owner review of spec.md — assesses user needs, business value, scope clarity, and acceptance criteria quality before planning begins.
handoffs:
  - label: UI/UX Review
    agent: speckit.ux-review
    prompt: Run the UI/UX review for this feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Assess `spec.md` from a product ownership perspective. Answer: **Are we building the
right thing?** Produce `reviews/product-owner.md` using the `po-review-template.md`
as the output structure. This review is implementation-agnostic — do NOT comment on
React components, database tables, API design, or framework choices. Those belong to
the Lead Developer review and the planning phase.

## Prerequisites

Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse
JSON for `FEATURE_DIR`. Derive:

- `SPEC` = `FEATURE_DIR/spec.md`
- `REVIEWS_DIR` = `FEATURE_DIR/reviews/`
- `OUTPUT` = `FEATURE_DIR/reviews/product-owner.md`
- `CONSTITUTION` = `.specify/memory/constitution.md`
- `TEMPLATE` = `.specify/extensions/templates/po-review-template.md`

If `spec.md` is missing, STOP: *"Run /speckit.specify first to create the feature spec."*

Create `REVIEWS_DIR` if it does not exist.

## Execution

### 1. Load Inputs

Read:
- `spec.md` in full
- `constitution.md` — focus on Principles 1–6 (product-level governance)

### 2. Assess User Needs

For each user story in the spec:
- Is it written from the user's perspective (goal-oriented) or the solution's perspective?
- Is the priority assignment justified?
- Does it deliver independent, demonstrable value if implemented alone?

### 3. Assess Business Value

- Is the overall feature worth building relative to its implied complexity?
- Is the expected outcome clearly tied to a user or business goal?
- Is there a simpler path to the same value that the spec has not considered?

### 4. Assess Scope

- Identify scope creep risks: requirements that go beyond the stated feature goal
- Identify missing scope: things users would naturally expect that are absent
- Mark both explicitly — do not silently exclude items

### 5. Assess Acceptance Criteria

For each acceptance scenario:
- Can a tester verify this without asking the author? (unambiguous)
- Does it cover both the happy path and the key failure mode?
- Is the "Then" clause a user-observable outcome, not a system internal?

### 6. Identify Open Questions

List questions that must be answered before the spec can be approved. For each:
- State the question precisely
- State its impact (High / Med / Low) on scope or user experience
- Suggest a resolution

### 7. Check Constitution Alignment

Review whether the spec respects product-level constitution principles. Flag any
principle where the spec's stated requirements would create a violation.

### 8. Write Output

Copy `po-review-template.md` to `OUTPUT` and fill every section with concrete
findings. Replace all placeholder tokens. Do not leave template comments in the
output. Set the **Verdict** to one of:

- **APPROVED** — spec is ready for UX and Lead review as-is
- **NEEDS REVISION** — specific changes listed in "Recommended Spec Changes"
- **REJECTED** — fundamental problem with the feature concept itself

## Constraints

- Do NOT suggest implementation approaches (components, APIs, data models)
- Do NOT modify `spec.md` — record recommendations in the review output only
- Do NOT access the application codebase
- Maximum 3 open questions — prioritise by scope impact

## Completion Report

Report to the user:
- Output file path
- Verdict
- Count of open questions (if any)
- Suggested next step: `/speckit.ux-review` (regardless of verdict — all three
  reviews run before cross-review resolves conflicts)
