# Product Owner Review: CMS Connections — Source and Target Configuration (Rev 2)

**Feature**: [spec.md](../spec.md)
**Reviewer**: Product Owner Agent
**Created**: 2026-08-10
**Revision**: 2 — AEM implementation scope update
**Status**: Complete

---

## Verdict

**APPROVED** — The scope change from FirstSpirit to AEM is correct and well-justified.
The original spec was based on incorrect information about the codebase (assuming
FirstSpirit had stubs to complete). The actual implementation gap is in AEM's
`authenticate`, `export`, `import`, and `publish` methods. The revised FR-012
accurately captures real, valuable work that enables AEM as a fully functional
migration source and target.

---

## Assessment of Scope Change

The key change in this revision is FR-012, which now covers four AEM methods:

**`authenticate()`** — Previously a stub returning `{ ok: true }` after a delay. Making
this real means AEM credential validation is honest: an invalid password will fail
the connection test rather than silently succeeding. This is a correctness fix with
direct user value — users currently see "validated" even when their AEM credentials
are wrong.

**`export()`** — This is the most substantial new scope. Building a real NexusTree
from AEM's content hierarchy enables content export for migration purposes. This
directly delivers value to users who need to migrate AEM content to another CMS.
The scope is appropriately bounded to the configured project's content tree.

**`import()`** — Accepting a NexusTree and writing to AEM via Sling POST servlet
enables AEM as a migration target, not just a source. This is the write-side of
migration — a legitimate and valuable capability.

**`publish()`** — AEM's replication API is well-established. Triggering activation
post-migration is a natural part of the import workflow. Scope is correct.

**No concerns** about scope creep — all four methods are part of the existing
`CMSConnector` interface. We are completing work that was always intended; it was
previously deferred with a silent stub.

---

## User Needs Assessment

The three user stories (US1, US2, US3) remain unchanged and are correctly prioritised.
The connector work (FR-012) underpins all three stories for AEM users specifically:
without real `authenticate()`, AEM users cannot get a genuine validation result.
Without real `export()`/`import()`/`publish()`, AEM cannot be used as a source or
target in a real migration.

The revised spec clearly separates:
- What is already done (Strapi, Contentful — FR-011, FR-013 marked as satisfied)
- What is new work (AEM stubs → real implementations — FR-012)

This is honest, accurate, and scoped correctly.

---

## Acceptance Criteria Quality

FR-012 now has four specific, testable acceptance criteria — one per method. Each
describes a user-observable outcome (real HTTP call, real NexusTree, real content
written, real replication triggered). All four are independently verifiable.

---

## Ambiguities and Open Questions

| # | Question | Impact | Recommended Resolution |
|---|----------|--------|------------------------|
| 1 | `export()` scope: does it export the full content tree or just structure (pages, no content values)? The spec says "page hierarchy, content, and asset references" — but full content export for large AEM sites could be very large. Is there a depth/size limit? | Medium | Add an assumption clarifying that `export()` captures structure and metadata (titles, paths, references) rather than full rich text content values. Full content body export belongs in story 008 (Content & Asset Migration). |

This is a recommendation, not a blocker. The spec is approved as-is for UX and Lead review.

---

## Recommended Spec Changes

1. **Clarify `export()` depth** — Add an assumption: *"The `export()` implementation
   in this story captures page structure, JCR metadata, and asset references. Full rich
   text content body export is deferred to story 008 (Content & Asset Migration)."*
   This prevents over-engineering in the implementation phase.
