# Server Action Contracts: CMS Connections

**Branch**: `001-cms-connections` | **Date**: 2026-08-10

All contracts are Next.js Server Actions (`'use server'`) in
`src/data/cms/actions.ts`. They return `ActionResponse<T>` — a discriminated
union `{ success: true, data: T } | { success: false, error: Error }`.

Authentication: all actions call `auth()` and return an error if no session exists.
RBAC: `write` permission required for mutating actions; `read` for queries.

---

## Existing Actions (already implemented — verify or extend)

### `getCmsConnections(projectId: string)`

Returns all connections for a project, ordered by `created_at` desc.
Excludes `configuration` (encrypted credentials never sent to client).

**Change for this story**: Switch from `db` to `dbUncached` to prevent stale
list after a write operation.

**Returns**: `ActionResponse<CmsConnectionView[]>`

`CmsConnectionView`:
```
id              string (uuid)
project_id      string (uuid)
provider        CmsConnectorKey
name            string
role            'source' | 'target' | 'general'   ← NEW
status          'unvalidated' | 'valid' | 'invalid' ← normalised from 'draft'/'active'/'error'
capabilities    Capability[]
health          ConnectionHealth | null
created_at      Date
updated_at      Date
```

---

### `upsertCmsConnection(input: CmsConnectionInput)`

Create or update a connection. On update, merges secrets via `mergeSecrets()`.
Resets `status` to `draft` (`unvalidated`) on every save.

**Change for this story**: Add `role` field to `CmsConnectionInput` and
persist it to the new `cms_connection.role` column.

**Input** (`CmsConnectionInput`):
```
id?             string (uuid) — if present, update; if absent, create
project_id      string (uuid)
environment_id? string (uuid)
provider        CmsConnectorKey
role            'source' | 'target' | 'general'   ← NEW
config          object — provider-specific, validated against cmsConfigSchemas[provider]
                         secret fields may be SECRET_PLACEHOLDER ('__KEEP__') on edit
```

**Returns**: `ActionResponse<CmsConnectionView>`

---

### `validateCmsConnection(connectionId: string)`

Runs the connector's `validationTasks()` in sequence. Inserts one
`cms_connection_validation` row per task. Updates `cms_connection.status`
to `active` (→ `valid`) on full success or `error` (→ `invalid`) on failure.
Updates `cms_connection.health`.

**No changes required for this story** — already implemented. The UI must
surface the task-by-task results in the connection test result panel (new
UI pattern identified in UX review).

**Returns**: `ActionResponse<ValidationRun>`

`ValidationRun`:
```
connection_id   string (uuid)
status          'valid' | 'invalid'
tasks           ValidationTaskResult[]
```

`ValidationTaskResult`:
```
id              string
name            string
status          'success' | 'warning' | 'error'
message?        string
duration_ms?    number
```

---

### `deleteCmsConnection(connectionId: string)`

Deletes a connection. Cascade deletes validation history and discovery jobs.

**Change for this story**: Before deleting, check if any `cms_discovery_job`
with status `pending` or `running` references this connection. If so, return
an error with the job id(s) — satisfying US3/AC4 (delete blocked on in-use
connection) and FR-009.

**Returns**: `ActionResponse<{ id: string }>`

---

### `discoverCapabilities(connectionId: string)`

Runs the connector's `capabilityProbes()`. Caches results in
`cms_connection.capabilities` and updates `cms_connection.health`.

**No changes required for this story** — already implemented.

**Returns**: `ActionResponse<CapabilityRun>`

---

## New Utility (not an action)

### `validateEndpointUrl(url: string): void`  (`src/lib/ssrf-guard.ts`)

Throws a descriptive error if the URL targets a disallowed host.

Disallowed:
- Non-HTTP/HTTPS schemes
- Loopback addresses (`127.x.x.x`, `::1`, `localhost`)
- Private IPv4 ranges (`10.x`, `172.16-31.x`, `192.168.x`)
- Link-local / cloud metadata (`169.254.x.x`)

Called by each connector's HTTP client (`strapiRequest`, future
`firstSpiritRequest`) before any `fetch`.

---

## UI Component Contracts

### Connection Form

Inputs and their validation:
```
role            required  'source' | 'target' | 'general'
                          displayed as a segmented control or radio group
                          placed first — filters capability options

provider        required  CmsConnectorKey
                          displayed as a searchable selector with logos
                          driven by CMS_CONNECTOR_OPTIONS (available: true only)

[dynamic fields] required per cmsConfigSchemas[provider]
                          rendered from the connector config Zod schema
                          secret fields: type="password", never pre-populated on edit,
                          send SECRET_PLACEHOLDER when unchanged

Test Connection  button    triggers validateCmsConnection
                          shows per-task progress in result panel
                          disables Save until test passes or user explicitly overrides

Save             button    triggers upsertCmsConnection
                          shows loading state during save
                          on success: confirmation message + redirect to list
                          on error: inline error, form remains open
```

### Connections List

Columns:
```
Name            string
Provider        string + logo
Role            badge: Source | Target | General
Status          badge: Unvalidated | Valid | Invalid  (colour-coded)
Last Validated  timestamp (from most recent validation run) | '—'
Actions         Edit | Delete
```

Empty state: shown when no connections exist for the project.
- Headline: "No connections configured"
- Body: brief explanation that source and target connections are needed before
  a migration can begin
- CTA: "Add Connection" button

### Test Connection Result Panel

Displayed inline below the form after triggering a test.

Per-task rows:
```
[icon] Task Name     [status badge]     [duration]
       Optional message (on warning/error)
```

Overall result: "Connection validated successfully — N capabilities detected"
or "Validation failed — [task name] returned an error"

---

## Validation Rules (from `cmsConfigSchemas`)

All connector configs are validated server-side via Zod before encryption.

| Connector | Required fields | Constraints |
|---|---|---|
| Strapi | `name`, `serverUrl`, `apiToken` | `serverUrl` must be valid URL |
| FirstSpirit | `name`, `serverUrl`, `username`, `password` | `serverUrl` must be valid URL |
| AEM | `name`, `authorUrl`, `auth`, `project` | `authorUrl` must be valid URL; `auth` is discriminated union |
| Contentful | `name`, `deliveryToken`, `spaceId` | multiple optional URL fields |

SSRF guard applied to all `*Url` / `*Host` fields before any HTTP request.
