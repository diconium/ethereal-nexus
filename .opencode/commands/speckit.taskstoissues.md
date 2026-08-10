---
description: Convert feature user stories into well-structured GitHub issues and add them to the configured GitHub Project.
tools: ['github/github-mcp-server/list_issues', 'github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before tasks-to-issues conversion)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_taskstoissues` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and
   parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like
   "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

1. **IF EXISTS**: Load `.specify/memory/constitution.md` for project principles and governance constraints.

1. Load the following from FEATURE_DIR:
   - **`spec.md`** — extract epic name, story name, user stories (US1, US2, US3...) with their priorities,
     acceptance criteria, and scope boundaries
   - **`tasks.md`** — extract task phases and task descriptions for implementation detail summaries
   - **`plan.md`** (if present) — extract branch name and technical summary

1. **Resolve TARGET_REPO** — determine which GitHub repository will receive the issues:

   a. Read `.specify/github.json` (if it exists and is valid JSON).
   b. If `issues_repo` is present and non-empty in that file, set `TARGET_REPO` to its value
      (format: `owner/repo`, e.g. `diconium/ethereal-nexus-private-issues`).
   c. If `.specify/github.json` does not exist, cannot be parsed, or `issues_repo` is absent
      or empty, fall back to deriving `TARGET_REPO` from the Git remote:

      ```bash
      git config --get remote.origin.url
      ```

      Parse the remote URL to extract `owner/repo`:
      - SSH format `git@github.com:owner/repo.git` → `owner/repo`
      - HTTPS format `https://github.com/owner/repo.git` → `owner/repo`

   d. Validate that `TARGET_REPO` is in `owner/repo` format and belongs to `github.com`.
      If validation fails, STOP with:
      *"Could not resolve a valid GitHub repository. Check .specify/github.json or git remote origin."*

   e. Read `project_number` and `project_owner` from `.specify/github.json` if present.
      If `project_number` is set, issues will be added to that GitHub Project after creation.

   f. Report to the user before proceeding:
      ```
      Creating issues in: <TARGET_REPO>
      GitHub Project: <project_owner>/projects/<project_number> (or: not configured)
      Source: .specify/github.json (or: git remote origin)
      ```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF TARGET_REPO IS A VALID GITHUB REPOSITORY IN `owner/repo` FORMAT.
> ONLY CREATE ISSUES IN TARGET_REPO — NEVER IN ANY OTHER REPOSITORY.

1. **Determine issue grouping strategy** — issues are created at **user story level**, not task level:

   From `spec.md`, identify the set of user stories (US1, US2, US3...) plus any cross-cutting
   concerns (e.g. a connector implementation story, a tests story, an ops/migration story).

   **Issue groups to create** (one GitHub issue per group):
   - One issue per user story from `spec.md`
   - One issue for significant cross-cutting technical work (e.g. a new connector, a security utility)
     if it is substantial enough to stand alone
   - One issue for test coverage if tests span multiple stories
   - One issue for operational tasks (migrations, epic tracking) if present

   **Do NOT create one issue per task.** Tasks are implementation details — they belong in the
   issue body as a checklist, not as separate issues.

1. **Deduplicate** — before creating anything, use the GitHub MCP server's `list_issues` tool
   (or `gh issue list` via shell) to fetch existing open and closed issues from TARGET_REPO.
   Check each candidate issue title against existing titles — skip any that already exist
   (match on the `[Feature] IssueType —` prefix pattern).
   Request `perPage: 100`; paginate if needed.

1. **For each issue group**, create one GitHub issue in TARGET_REPO using this structure:

   **Title format**: `[Feature Name] Type — Short description`

   Examples:
   - `[CMS Connections] US1 — Configure a Source CMS Connection`
   - `[CMS Connections] FirstSpirit — Replace stub connector with real network implementation`
   - `[CMS Connections] Tests — Unit, SSRF, RBAC, and E2E coverage`

   **Body format** (use actual newlines — write body to a temp file when using `gh` CLI):

   ```markdown
   ## [Epic Name] — [Story Name]

   **Priority:** [P1/P2/P3 + 🎯 MVP if applicable]
   **Spec:** `specs/[feature-dir]/spec.md` — [User Story N or cross-cutting concern]
   **Branch:** `[branch-name]`
   **Depends on:** #[issue-number] ([issue title]) — if applicable

   ---

   ## Goal

   [2–4 sentences describing what the user/developer can do when this issue is complete.
   Written from the user's perspective. No implementation details.]

   ---

   ## Acceptance Criteria

   - [ ] [Criterion from spec.md acceptance scenarios — user-observable outcome]
   - [ ] [Criterion]
   - [ ] [Criterion]

   ---

   ## Out of Scope

   - [What is explicitly excluded and where it belongs]

   ---

   ## Implementation Tasks

   See `specs/[feature-dir]/tasks.md` — [Phase N] (T001–TNNN)

   Key work:
   - [2–5 bullet points summarising the most important implementation tasks]
   ```

   **Critical formatting rules:**
   - Write the body to a **temp file** (e.g. `/tmp/issue-body.md`) and use `--body-file` with
     `gh issue create`. Never use `--body` with `\n` escape sequences — they render as literal
     backslash-n in GitHub.
   - Acceptance criteria MUST come from `spec.md` acceptance scenarios — not from `tasks.md`.
   - Goal section MUST be written from the user's perspective — no file paths, no framework names.
   - Implementation Tasks section provides the link to `tasks.md` for engineers who need detail.

1. **Apply labels, milestone, and issue type** to each created issue:

   **Labels** — apply all that are relevant, creating them first if they do not exist:

   | Label | When to apply | Colour |
   |---|---|---|
   | `epic:<epic-slug>` | Always — derived from epic name (e.g. `epic:cms-migration`) | `#0052CC` |
   | `story:<feature-slug>` | Always — derived from feature dir name (e.g. `story:cms-connections`) | `#5319E7` |
   | `priority:p1` | User stories / issues with P1 priority in spec | `#B60205` |
   | `priority:p2` | User stories / issues with P2 priority in spec | `#E4E669` |
   | `priority:p3` | User stories / issues with P3 priority in spec | `#FBCA04` |
   | `type:user-story` | Issues representing a user story from spec.md | `#0E8A16` |
   | `type:connector` | Issues implementing a CMS connector | `#1D76DB` |
   | `type:testing` | Issues focused on test coverage | `#FBCA04` |
   | `enhancement` | All feature issues (GitHub built-in) | existing |

   Create missing labels before applying them:
   ```bash
   gh label create "<name>" --repo <TARGET_REPO> --description "<desc>" --color "<hex>" 2>/dev/null || true
   gh issue edit <number> --repo <TARGET_REPO> --add-label "<label1>,<label2>,..."
   ```

   **Milestone** — create a milestone named after the feature if it does not exist, then apply it:
   ```bash
   # Create (idempotent — ignore error if already exists)
   gh api repos/<TARGET_REPO>/milestones --method POST \
     --field title="<feature-name>" \
     --field description="<epic>: <feature-name>" 2>/dev/null || true

   # Get milestone number
   MILESTONE=$(gh api repos/<TARGET_REPO>/milestones --jq '.[] | select(.title=="<feature-name>") | .number')

   # Apply
   gh issue edit <number> --repo <TARGET_REPO> --milestone "<feature-name>"
   ```

   **Issue type** — set via GraphQL mutation using the repository's issue type IDs.
   First fetch the available types:
   ```bash
   gh api graphql -f query='{
     repository(owner: "<owner>", name: "<repo>") {
       issueTypes(first: 20) { nodes { id name } }
     }
   }'
   ```

   Apply the correct type based on the issue group:

   | Issue group | Issue type |
   |---|---|
   | User story (US1, US2, US3…) | `Feature` |
   | Connector implementation | `Feature` |
   | Cross-cutting technical work | `Feature` |
   | Test coverage | `Task` |
   | Operational / migration tasks | `Task` |
   | Bug fix | `Bug` |

   ```bash
   gh api graphql -f query='
     mutation {
       updateIssue(input: { id: "<node_id>", issueTypeId: "<type_id>" }) {
         issue { number title }
       }
     }'
   ```

   Get the issue `node_id` from:
   ```bash
   gh api repos/<TARGET_REPO>/issues/<number> --jq '.node_id'
   ```

1. **Add to GitHub Project** — if `project_number` is set in `.specify/github.json`:

   After creating each issue, add it to the project using:
   ```bash
   gh project item-add <project_number> --owner <project_owner> \
     --url https://github.com/<TARGET_REPO>/issues/<issue-number>
   ```

   Report each addition. If the `project` scope is missing from the token, report:
   *"Issues created but not added to project — run `gh auth refresh -s project` then
   re-run `/speckit.taskstoissues` (existing issues will be skipped by deduplication)."*

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN ANY REPOSITORY OTHER THAN TARGET_REPO.

## Post-Execution Checks

**Check for extension hooks (after tasks-to-issues conversion)**:
Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_taskstoissues` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently
