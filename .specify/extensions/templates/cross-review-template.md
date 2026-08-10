# Cross Review: [FEATURE NAME]

**Feature**: [link to spec.md]
**Reviews consumed**:
- `reviews/product-owner.md` — [APPROVED / NEEDS REVISION / REJECTED]
- `reviews/ui-ux.md` — [APPROVED / NEEDS REVISION / REJECTED]
- `reviews/lead-developer.md` — [APPROVED / NEEDS REVISION / BLOCKED]

**Created**: [DATE]
**Status**: Draft

## Overall Readiness

<!--
  Synthesise the three verdicts into a single readiness assessment.
  Choose one:
  - READY FOR PLANNING — all verdicts APPROVED, no conflicts requiring human decision
  - CONFLICTS REQUIRE RESOLUTION — one or more conflicts must be resolved before planning
  - BLOCKED — a BLOCKED or REJECTED verdict exists; planning cannot proceed
-->

**[READY FOR PLANNING / CONFLICTS REQUIRE RESOLUTION / BLOCKED]**

[One paragraph summary of the overall state: what the three reviews agree on,
what they disagree on, and what that means for the path to planning.]

## Conflicts Identified

<!--
  A conflict exists when:
  - Two reviews take incompatible positions on the same topic
  - One review's recommendation would invalidate another review's requirement
  - A review's verdict is NEEDS REVISION or BLOCKED for a reason that affects
    the other reviews

  Do NOT resolve conflicts here. Surface them with options for the human to decide.
  If no conflicts exist, write "No conflicts identified — reviews are mutually consistent."
-->

| # | Topic | PO Position | UX Position | Lead Position | Conflict Type | Decision Options |
|---|-------|-------------|-------------|---------------|---------------|-----------------|
| C1 | [topic] | [position or N/A] | [position or N/A] | [position or N/A] | Direct / Implicit / Scope | A) ... B) ... C) ... |

*Conflict types:*
- **Direct**: Two reviews explicitly contradict each other
- **Implicit**: Reviews don't contradict but their combined requirements are infeasible
- **Scope**: Reviews disagree on what is in or out of scope

## Spec Changes Required

<!--
  Aggregate all "Recommended Spec Changes" from the three reviews.
  De-duplicate and flag any that conflict with each other.
-->

| # | Change | Requested by | Conflicts with |
|---|--------|--------------|----------------|
| 1 | [change] | PO / UX / Lead | [conflicting change or "None"] |

*If no changes required: "All reviews approved the spec as-is."*

## Agreements (Reinforced Points)

<!--
  Points where two or more reviews independently reached the same conclusion.
  These become high-confidence inputs to planning — /speckit.plan should treat
  them as settled.
-->

- [Point of agreement — e.g., "PO and Lead both flag that rate limiting must be
  considered for the AI chatbot endpoint (PO: scope, Lead: technical risk)"]
- [Point of agreement]

*If no strong agreements beyond the obvious: "Reviews covered complementary areas
with no significant overlap."*

## Open Decisions Required from Human

<!--
  Decisions that MUST be made by a human before /speckit.plan proceeds.
  Each decision should present concrete options — not open-ended questions.
  If overall readiness is READY FOR PLANNING, this section may be empty.
-->

1. **[Topic]**
   Context: [why this decision is needed]
   Options:
   - A) [option] — implies [consequence]
   - B) [option] — implies [consequence]
   - C) [option] — implies [consequence]

*If no decisions required: "No human decisions required — proceed to /speckit.plan."*

## Synthesis for Planning

<!--
  A brief, forward-looking paragraph for /speckit.plan to consume.
  Written as if all conflicts above have been resolved (leave placeholders
  for any that are still open at time of writing).
  This is the hand-off note from the review phase to the planning phase.
-->

[Summary of what /speckit.plan should know: the settled technical constraints from
the Lead review, the UX requirements that are non-negotiable, the scope boundaries
the PO established, and any open decisions that still need to be resolved before
or during planning.]
