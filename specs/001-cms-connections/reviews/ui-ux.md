# UI/UX Review: CMS Connections — Source and Target Configuration (Rev 2)

**Feature**: [spec.md](../spec.md)
**Reviewer**: UI/UX Agent
**Created**: 2026-08-10
**Revision**: 2 — AEM implementation scope update
**Status**: Complete

---

## Verdict

**APPROVED** — The scope change to AEM has no material impact on UX. All five UX
gaps identified in revision 1 have been addressed in the spec. The AEM connector
implementation (FR-012) is entirely server-side — it does not introduce new UI
patterns or change any user-facing flows.

---

## Impact of AEM Scope Change on UX

The replacement of FirstSpirit with AEM in FR-012 is invisible to the user at the
UI level. The connection form, test result panel, connections list, and all state
handling (loading, empty, error, success) are CMS-agnostic — they are driven
dynamically by the connector manifest. Adding or completing a connector does not
require any new UI components.

The one UX-adjacent concern: `export()` is a new server-side capability. If the
UI surfaces an "Export" action on a connection card (which the existing feature
flags suggest it does), users connecting to AEM will now see a functional export
rather than a silent stub result. This is a positive UX improvement — the action
will work as labelled.

---

## States Coverage (Unchanged from Rev 1 — All Addressed)

| State | Status |
|-------|--------|
| Loading — Test Connection | Addressed (NFR-002) |
| Loading — Save action | Addressed (NFR-006) |
| Empty — no connections | Addressed (US1/AC6) |
| Error — test failure | Addressed (US1/AC3) |
| Error — save failure | Addressed (US1/AC8) |
| Success — test passed | Addressed (US1/AC2) |
| Success — saved | Addressed (US1/AC7) |
| Disabled — viewer permission | Addressed (NFR-003) |
| Disabled — in-use delete | Addressed (US3/AC4) |

---

## New UX Consideration: AEM Export Progress

`export()` traverses an AEM content repository — potentially a large operation for
big sites. If the UI exposes an export action, it needs a progress indicator for
long-running exports, not just a simple loading spinner. This is not in scope for
the connection management UI (this story) but should be noted for story 008.

No spec changes required for this story.

---

## Conflicts with PO Review

None. PO's recommendation to clarify `export()` depth is consistent with UX — a
bounded export (structure + metadata, not full content) is faster and less likely
to produce a timeout in the connection test context.

---

## Recommended Spec Changes

None required. The PO's recommendation (clarify export depth in Assumptions) is
sufficient and does not require a UX change.
