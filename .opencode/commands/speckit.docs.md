---
description: Generate or update Astro documentation for the implemented feature in web/site/src/content/docs/
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Generate or update the Astro (Starlight) documentation for the feature that was just implemented.
Read the feature's spec and plan artifacts to understand what was built, determine the correct
location and structure for the docs, then create or update the relevant `.mdx` file(s) under
`web/site/src/content/docs/`.

## Outline

### 1. Load Feature Artifacts

Run `.specify/scripts/bash/check-prerequisites.sh --json --include-tasks` from repo root and parse
FEATURE_DIR. Then read:

- **REQUIRED**: `FEATURE_DIR/spec.md` — functional requirements, user stories, acceptance criteria
- **REQUIRED**: `FEATURE_DIR/plan.md` — architecture, tech stack, file structure, API contracts
- **IF EXISTS**: `FEATURE_DIR/data-model.md` — entities and relationships
- **IF EXISTS**: `FEATURE_DIR/contracts/` — API specifications

### 2. Determine Doc Placement

Inspect the existing sidebar structure in `web/site/astro.config.mjs` and the directories under
`web/site/src/content/docs/` to decide where this feature's documentation belongs:

**Existing top-level sections:**

| Section | Directory | Use for |
|---|---|---|
| Getting Started | `setup/` | Initial setup, installation, configuration |
| Authentication | `authentication/` | Auth methods and providers |
| Connectors | `connectors/` | CMS connectors (AEM, Strapi, etc.) |
| Dashboard | `dashboard/` | Dashboard features, API, access management |
| Reference | `reference/` | CLI, components, API reference |
| Dialogs | `dialogs/` | Dialog field types and configuration |

Rules:
- If the feature maps to an existing section, add a new `.mdx` file inside it.
- If the feature introduces a genuinely new top-level concept (e.g. a new connector, a new auth
  provider), create a new subdirectory and its entry file.
- If the feature extends an existing page, update that page in place rather than creating a new one.
- Never add a new top-level sidebar section without also updating `web/site/astro.config.mjs`.

### 3. Read Existing Docs for Style Reference

Before writing, read one or two existing `.mdx` files from the target section to match:
- Frontmatter fields (`title`, `description`, `sidebar.order`, optional `badge`)
- Heading hierarchy (H2 for major sections, H3 for subsections)
- Use of Starlight components (`CardGrid`, `LinkCard`, `Code`, `Tabs`, etc.)
- Tone: concise, user-facing, action-oriented

### 4. Draft the Documentation

Write documentation that covers, in order:

1. **Overview** — what the feature does and why it matters (1–3 sentences)
2. **Prerequisites** — any setup, environment variables, or dependencies required
3. **How it works** — key concepts, architecture decisions from plan.md relevant to users
4. **Usage** — step-by-step instructions or configuration examples; include code blocks where
   relevant using `<Code>` or fenced code blocks with a language tag
5. **API / Configuration reference** — if the feature exposes API endpoints or config options,
   document them in a table: `| Field | Type | Required | Description |`
6. **Related pages** — use `<CardGrid>` + `<LinkCard>` to link to related docs when 2+ pages exist

**Frontmatter template:**

```mdx
---
title: <Feature Name>
description: <One sentence that describes what this feature enables for the user.>
sidebar:
  order: <integer — place after the last existing page in the section>
---
```

**Do not:**
- Copy internal implementation details from plan.md verbatim
- Mention task IDs, spec references, or internal spec/plan terminology
- Add screenshots placeholders unless actual assets exist under `web/site/src/assets/`

### 5. Write the File(s)

- Write the new or updated `.mdx` file(s) to the correct path under `web/site/src/content/docs/`.
- If a new top-level section is needed, also update the `sidebar` array in
  `web/site/astro.config.mjs` to include the new directory (use `autogenerate` for new directories
  with multiple pages, or an explicit `items` list for a single page).

### 6. Completion Report

Output a summary:

```
## Documentation Generated

| File | Action |
|------|--------|
| web/site/src/content/docs/<path>.mdx | created / updated |

Sidebar config updated: yes / no
```

If `astro.config.mjs` was updated, show the diff of the sidebar change only.
