# Cross Review: CMS Connections — Source and Target Configuration (Rev 2)

**Feature**: [spec.md](../spec.md)
**Reviews consumed**:
- `reviews/product-owner.md` (Rev 2) — **APPROVED**
- `reviews/ui-ux.md` (Rev 2) — **APPROVED**
- `reviews/lead-developer.md` (Rev 2) — **APPROVED**

**Created**: 2026-08-10
**Status**: Complete

---

## Overall Readiness

**CONFLICTS REQUIRE RESOLUTION** — All three reviews approve the direction.
Two spec changes are needed before planning: the PO's export depth clarification
and the Lead's `features()` correctness fix. Both are minor and non-conflicting.
One open decision on `features()` flag timing needs confirmation.

---

## Conflicts Identified

No conflicts between the three reviews. All three are mutually consistent on:

- AEM scope change is correct and well-justified
- FR-012 four-method breakdown is accurate and complete
- UX is unaffected by the connector changes
- SSRF guard wiring into `aemRequest()` is the correct single-fix approach
- export depth limitation is appropriate for this story

---

## Spec Changes Required

| # | Change | Requested by | Conflicts with |
|---|--------|--------------|----------------|
| 1 | Add assumption clarifying `export()` captures structure and metadata only — full content body deferred to story 008 | PO | None |
| 2 | Address `features()` correctness — `export-content` and `export-assets` are marked `supported: true` while `export()` is still a stub. Must either set `supported: false` now or complete the implementation before merge | Lead | None — UX and PO agree functionality should not be implied before it works |

Both changes are required before planning proceeds.

---

## Agreements (Reinforced Points)

- **SSRF in `aemRequest()` not per-method**: All three reviews agree. Wiring the
  SSRF guard once into the base client is the correct, future-proof approach.
- **`export()` depth cap**: PO and Lead independently converged on the same boundary
  — structure + metadata, not full content. 10,000 nodes / 5 levels is a reasonable
  cap for this story.
- **`import()` role guard**: PO (scope), UX (not affected), and Lead (security) all
  confirm that `import()` must validate `target` role before writing to AEM.
- **`features()` must be honest**: Constitution P14-6 is explicit — no UI that implies
  functionality is live while stubs remain. All three reviews agree this must be fixed.

---

## Open Decisions Required from Human

1. **`features()` flag approach for `export-content` and `export-assets`**

   Context: The AEM connector currently declares these features as
   `supported: true, readOnly: true` while `export()` is a stub. The Lead review
   flags this as a P14-6 violation.

   Options:
   - A) **(Recommended) Implement `export()` fully in this PR** — set `supported: true`
     and deliver. Keeps the features honest and delivers real value now.
   - B) **Set `supported: false` now, flip to `true` in story 008** — honest but
     delays user-visible export capability to the content migration story.

   Recommendation: Option A. The Lead review confirms `export()` is technically
   feasible with existing primitives. Building it now avoids a confusing regression
   where users see export disappear between versions.

---

## Synthesis for Planning

With spec changes 1 and 2 applied and decision 1 resolved:

**Settled technical constraints from Lead:**
- SSRF guard wired into `aemRequest()` — single point, covers all methods
- `export()` depth-capped at 10,000 nodes / 5 levels — document in code
- `import()` must validate `target` role server-side before any Sling POST
- `publish()` must batch paths in groups of 50
- Extract `export`, `import`, `publish` logic into dedicated files in `aem/`
- `features()` must be corrected before PR merges (per decision above)

**Non-negotiable UX requirements from UX:**
- All existing UX requirements from Rev 1 remain in force
- No new UI requirements introduced by AEM connector methods

**Scope boundaries confirmed by PO:**
- `export()` = structure + JCR metadata + asset references only
- Full content body export = story 008
- FirstSpirit = future story (not this one)
- Strapi and Contentful = already done (FR-011, FR-013 satisfied)
