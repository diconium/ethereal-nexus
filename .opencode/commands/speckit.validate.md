---
description: Post-implementation validation — compares the built feature against spec acceptance criteria and produces a validation report. RESERVED FOR FUTURE IMPLEMENTATION.
---

## Status: Not Yet Implemented

This command is reserved for a future implementation phase.

**Current recommendation:** Use `/speckit.converge` for post-implementation gap
detection. Converge compares the codebase against `spec.md`, `plan.md`, and
`tasks.md` and appends any remaining work to `tasks.md` for `/speckit.implement`
to complete.

## Intended Future Behaviour

When implemented, this command will:

1. Read `spec.md` — specifically the Functional Requirements (FR-###), Non-Functional
   Requirements (NFR-###), and Success Criteria (SC-###)
2. Read `reviews/cross-review.md` — for settled constraints and agreed scope
3. Run targeted validation scenarios against the built feature
4. Produce `validation.md` at `FEATURE_DIR/validation.md` with:
   - Pass / Fail / Partial status per acceptance criterion
   - Evidence for each finding (observed behaviour vs. specified behaviour)
   - NFR compliance status (accessibility, performance, security checks)
   - A readiness verdict: VALIDATED / NEEDS WORK / BLOCKED

## Intended Lifecycle Position

```text
/speckit.implement
       ↓
/speckit.validate   ← this command (future)
       ↓
/speckit.converge   ← gap detection against spec/plan/tasks
       ↓
Done (if converged) or new tasks (if gaps remain)
```

## How to Contribute

If you would like to implement this command, open an issue referencing this stub
and the feature spec for the validation workflow.
