# Data Model: CMS Connections — Source and Target Configuration

**Branch**: `001-cms-connections` | **Date**: 2026-08-10

---

## Existing Tables (No Changes Required)

### `cms_provider`
Catalogue of registered connector types. Already complete. No modifications.

### `cms_connection_validation`
Per-task validation history for a connection.
- `id` uuid PK
- `connection_id` uuid FK → `cms_connection` (cascade delete)
- `task` text — task id (e.g. `reachable`, `auth`)
- `status` text — `success | warning | error`
- `message` text nullable
- `duration_ms` integer nullable
- `executed_at` timestamp

Already satisfies FR-010 (validation history). No modifications required.

---

## Modified Tables

### `cms_connection` — additive changes only

Existing columns: `id`, `project_id`, `environment_id`, `provider`, `name`,
`configuration` (AES-GCM encrypted text), `status`, `capabilities` (jsonb),
`health` (jsonb), `created_at`, `updated_at`.

**New column: `role`**

```
role  text  NOT NULL  DEFAULT 'general'
```

Values: `source | target | general`

- `source` — read/discover capabilities; used for Discovery stage
- `target` — write/provision/asset-upload capabilities; used for Provisioning stage
- `general` — not role-designated (default for existing rows, backward compatible)

**Status value normalisation** (no schema change — UI/DTO layer change):

The existing `status` text column maps to the spec's validation status:

| Existing value | Spec value | When set |
|---|---|---|
| `draft` | `unvalidated` | On create or edit (upsertCmsConnection resets to draft) |
| `active` | `valid` | After successful validateCmsConnection run |
| `error` | `invalid` | After failed validateCmsConnection run |

No column change needed. The DTO and UI display layers must map these values.
The `cmsConnectionViewSchema` in `dto.ts` must expose the normalised enum.

**Migration required**: Yes — `db:generate` then `db:migrate`. `db:push` is not
acceptable. Default `'general'` ensures backward compatibility for existing rows.

---

## State Transitions

### Connection Validation Status

```
[created/edited]
      │
      ▼
 unvalidated  ──── "Test Connection" triggered ────►  testing (UI only, not persisted)
      │                                                     │
      │                                      ┌─────────────┴─────────────┐
      │                                      ▼                           ▼
      │                                   valid                       invalid
      │                                      │                           │
      └──────── edit endpoint/credentials ───┴───────────────────────────┘
                     (resets to unvalidated)
```

Only `valid` connections may be used in Discovery or Provisioning (enforced
server-side in downstream story 002 Server Actions).

---

## Key Entities and Their Representations

### CMS Provider
Stored in `cms_provider`. Read-only registry — no new rows added by this story.
Drives the connector type selector in the UI via `CMS_CONNECTOR_OPTIONS`.

### CMS Connection
Stored in `cms_connection`. Core entity for this story.

Fields exposed to the UI (via `cmsConnectionViewSchema`):
- `id` — uuid
- `project_id` — uuid
- `provider` — connector key (e.g. `strapi`, `firstspirit`)
- `name` — user-given name for this connection
- `role` — `source | target | general` (new)
- `status` — normalised to `unvalidated | valid | invalid`
- `capabilities` — jsonb array of `{ key, supported }` objects
- `health` — jsonb `{ score, warnings, missingCapabilities, status }`
- `created_at`, `updated_at`

Fields never exposed to the UI:
- `configuration` — AES-GCM encrypted JSON (contains credentials)
- `environment_id` — internal FK

### Connection Capability
Not a separate table — stored as `capabilities` jsonb on `cms_connection` and
returned from capability probe runs. Shape: `Capability[]` where
`Capability = { key: CapabilityKey, supported: boolean, version?: string }`.

Capabilities are discovered and cached during `discoverCapabilities()`. They are
not user-declared checkboxes — they are detected from the live CMS. The spec's
"list of capabilities to enable" maps to selecting which probes to run, not
manually ticking capabilities.

### Connection Validation (history)
Stored in `cms_connection_validation`. Each `validateCmsConnection` run inserts
one row per task. The most recent set of rows for a connection constitutes its
validation history.

---

## Connector Configuration Schemas (in `config.ts`)

Each connector has a Zod schema defining its configuration fields. These schemas
drive the dynamic connection form — no new form components per connector.

| Connector | Config schema | Secret fields |
|---|---|---|
| Strapi | `strapiConfigSchema` | `apiToken` |
| FirstSpirit | `firstSpiritConfigSchema` | `password` |
| AEM | `aemConfigSchema` | `auth.password`, `auth.clientSecret` |
| Contentful | `contentfulConfigSchema` | `deliveryToken`, `managementToken` |

Secret fields are defined in `CMS_SECRET_FIELDS`. The UI sends `SECRET_PLACEHOLDER`
(`'__KEEP__'`) for unmodified secrets on edit; `mergeSecrets()` restores the stored
value server-side.

---

## SSRF Guard

A new utility `src/lib/ssrf-guard.ts` (not a schema entity, but a data model
dependency). Validates that a URL does not target:
- Private IPv4 ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Loopback: `127.0.0.0/8`, `::1`
- Link-local: `169.254.0.0/16` (cloud metadata)
- Any non-HTTP/HTTPS scheme

Called by each connector's HTTP client before making any outbound request.
