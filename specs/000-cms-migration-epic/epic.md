# Epic: CMS Migration

**Created**: 2026-08-10
**Status**: Discovery — stories being specified

## Description

CMS Migration in Ethereal Nexus is the process of moving a digital experience from a
source CMS to a target CMS while preserving its structure, content, relationships,
assets, and authoring model.

The epic separates the migration into clear, independently deliverable stages:
Connections → Discovery → Blueprint → Nexus Library → Mapping → Provision Plan →
Provisioning → Content & Asset Migration → Validation.

## Stage-to-Story Map

| # | Story | Stage | Status | Spec | Depends on |
|---|-------|-------|--------|------|------------|
| 001 | CMS Connections — Source & Target Configuration | Connections | 🔄 Reviewed — ready for planning | [spec.md](../001-cms-connections/spec.md) | — |
| 002 | CMS Discovery — Trigger & Job Management | Discovery | 🔲 Not started | — | 001 |
| 003 | Blueprint — Snapshot History & Visual Diff | Blueprint | 🔲 Not started | — | 002 |
| 004 | Nexus Library — Content Model Definition | Nexus Library | 🔲 Not started | — | 002 |
| 005 | Mapping — Blueprint-to-Library Mapping Editor | Mapping | 🔲 Not started | — | 003, 004 |
| 006 | Provision Plan — Generation & Review | Provision Plan | 🔲 Not started | — | 005 |
| 007 | Provisioning — Execute Plan on Target CMS | Provisioning | 🔲 Not started | — | 006 |
| 008 | Content & Asset Migration — Execute & Monitor | Content Migration | 🔲 Not started | — | 007 |
| 009 | Validation — Migration Result Verification | Validation | 🔲 Not started | — | 008 |

## Parallel Opportunities

```
001 (Connections)
    ↓
002 (Discovery)
    ↓
  ┌─────────────────┐
  │                 │
003 (Blueprint)   004 (Nexus Library)
  │                 │
  └────────┬────────┘
           ↓
      005 (Mapping)
           ↓
    006 (Provision Plan)
           ↓
      007 (Provisioning)
           ↓
  008 (Content & Asset Migration)
           ↓
      009 (Validation)
```

## Existing Codebase Baseline

| Stage | What already exists |
|---|---|
| Connections | `cms_provider`, `cms_connection`, `cms_connection_validation` schema; partial UI; Strapi + FirstSpirit connectors stubbed |
| Discovery | `cms_discovery_job` schema; scheduled re-discovery not implemented |
| Blueprint | Full graph schema (`cms_blueprint_node/edge/snapshot/change`); snapshot history UI + visual diff not implemented |
| Nexus Library | `nexus_library`, `nexus_library_definition` schema exists |
| Mapping | `data/meta/mapping/` partially stubbed — not implemented |
| Provision Plan | Not implemented |
| Provisioning | Not implemented |
| Content Migration | UI visual only — no real implementation |
| Validation | Not implemented |

## Architecture Constraints (from constitution Principle 14)

- Blueprint tables are **immutable** — they never hold Nexus IDs, mappings, or generated
  components. Mapping and provision belong to `data/meta/mapping/` and
  `data/meta/provision/` respectively.
- Each story that touches the DB **must** use `db:generate` to produce a migration file.
  `db:push` is not permitted in production.
- Stories touching the CMS domain must not mix the Blueprint domain with the Design domain.

## Status Legend

| Symbol | Meaning |
|--------|---------|
| 🔲 | Not started |
| 🔄 | In progress (spec / review / plan / implementation) |
| ✅ | Converged and merged |
| ⛔ | Blocked |
