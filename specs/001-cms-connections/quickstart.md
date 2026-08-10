# Quickstart Validation Guide: CMS Connections

**Branch**: `001-cms-connections` | **Date**: 2026-08-10

This guide describes how to verify that the CMS Connections feature is working
end-to-end after implementation. It covers the three user stories independently.

---

## Prerequisites

1. A running instance of the Ethereal Nexus dashboard (`pnpm dev` or Docker)
2. A PostgreSQL database with migrations applied (`pnpm db:migrate`)
3. `CMS_CONNECTOR_ENCRYPTION_KEY` environment variable set (32-byte base64 string)
4. A project created in the dashboard
5. A user account with `write` project permission

For connector-specific validation:
- **Strapi**: A running Strapi v5 instance with a full-access API token
- **FirstSpirit**: A running FirstSpirit server with valid username/password
  (only after FR-012 stub replacement is complete)

---

## US1 Validation — Configure a Source CMS Connection

### Test 1a: Empty state on first visit

1. Navigate to a project → Content → Connections tab
2. **Expected**: Empty state displayed with headline "No connections configured",
   explanation text, and "Add Connection" CTA button
3. **Pass**: Empty state is visible with a functional CTA

### Test 1b: Source connection form

1. Click "Add Connection"
2. **Expected**: Form appears with Role selector at the top (Source / Target / General)
3. Select **Source** role
4. **Expected**: Capability options shown reflect source capabilities
5. Select **Strapi** as provider
6. **Expected**: Dynamic form fields appear: Name, Server URL, API Token
7. API Token field should be a masked input (type="password" behaviour)
8. **Pass**: Form renders correctly, role selector filters capabilities

### Test 1c: Test Connection — success

1. Fill form with valid Strapi credentials (running Strapi v5 instance)
2. Click "Test Connection"
3. **Expected**: Loading state shown, per-task progress visible
4. **Expected**: After completion, result panel shows task list with statuses,
   overall success, detected capabilities count
5. **Pass**: All validation tasks pass, capabilities displayed

### Test 1d: Test Connection — failure

1. Fill form with invalid API token
2. Click "Test Connection"
3. **Expected**: Validation fails at `auth` task with message:
   "Invalid or missing API token. Generate a full-access token in Strapi Settings → API Tokens."
4. **Expected**: No credentials appear in error message
5. **Pass**: Error is specific, actionable, and credential-free

### Test 1e: Test Connection — SSRF protection

1. Fill Server URL with `http://169.254.169.254/` (cloud metadata endpoint)
2. Click "Test Connection"
3. **Expected**: Request is rejected immediately with a clear error
   ("Endpoint URL is not allowed") — **no network request is made**
4. **Pass**: SSRF guard fires before any fetch

### Test 1f: Save validated connection

1. After a successful test, click "Save"
2. **Expected**: Loading state during save
3. **Expected**: Success confirmation message shown
4. **Expected**: User returned to Connections list
5. **Expected**: New connection visible in list with:
   - Role badge: "Source"
   - Status badge: "Valid" (green)
   - Last Validated timestamp present
6. **Pass**: Connection saved and appears correctly

### Test 1g: Save failure

1. Disconnect from the database (simulate failure)
2. Attempt to save a connection
3. **Expected**: Error message shown, form remains open with data intact
4. **Pass**: No data loss on save failure

---

## US2 Validation — Configure a Target CMS Connection

### Test 2a: Target role shows different capabilities

1. Open "Add Connection" form
2. Select **Target** role
3. **Expected**: Capability options reflect target capabilities
   (write/provision/asset-upload — distinct from Source's read/discover)
4. **Pass**: Capability set differs from Source role

### Test 2b: Save target connection

1. Configure a target Strapi connection
2. Run test and save
3. **Expected**: Connection listed with Role badge: "Target"
4. **Pass**: Target connection saved correctly

### Test 2c: Duplicate target warning

1. With an existing target connection present, add a second connection of the
   same provider as target
2. **Expected**: Warning shown: "A target connection already exists.
   Do you want to replace it or add an additional one?"
3. **Pass**: Warning appears before proceeding

---

## US3 Validation — Manage and Re-validate

### Test 3a: Connections list

1. Navigate to Connections with multiple connections present
2. **Expected**: List shows Name, Provider (with logo), Role badge, Status badge,
   Last Validated, and action buttons (Edit, Delete)
3. **Pass**: All columns present and accurate

### Test 3b: Edit resets status

1. Click Edit on a `valid` connection
2. Change the Server URL
3. Save without running test
4. **Expected**: Status badge changes to "Unvalidated"
5. **Pass**: Edit correctly invalidates status

### Test 3c: Credential masking on edit

1. Click Edit on a connection with saved credentials
2. **Expected**: Secret fields (API Token, Password) are empty — NOT pre-populated
3. Type a new value in one secret field; leave the other blank
4. Save
5. **Expected**: The changed secret is updated; the blank secret retains the
   previously stored value (SECRET_PLACEHOLDER merge)
6. **Pass**: Credential masking and `mergeSecrets` work correctly

### Test 3d: Credential rotation

1. Edit a `valid` connection, update only the API token
2. Save
3. **Expected**: Status resets to "Unvalidated"
4. Re-run "Test Connection"
5. **Expected**: Validation uses the new credentials
6. **Pass**: Credential rotation works end-to-end

### Test 3e: Delete confirmation

1. Click Delete on a connection not referenced by any job
2. **Expected**: Confirmation dialog appears: "Delete [Name]? This action cannot
   be undone."
3. Click Cancel — **Expected**: Connection remains
4. Click Delete again, confirm — **Expected**: Connection removed from list
5. **Pass**: Delete confirmation works correctly

### Test 3f: Delete blocked on in-use connection

1. Ensure a connection has an active or pending discovery job
2. Attempt to delete the connection
3. **Expected**: Error: "This connection is used by job [id] and cannot be deleted."
4. **Pass**: In-use protection works

---

## Acceptance Criteria Cross-Reference

| Test | Spec Acceptance Scenario |
|---|---|
| 1a | US1/AC6 — Empty state |
| 1b | US1/AC1 — Form with capability list |
| 1c | US1/AC2 — Test success with capabilities |
| 1d | US1/AC3 — Test failure with specific error |
| 1e | NFR-008 — SSRF protection |
| 1f | US1/AC4, US1/AC7 — Save + confirmation |
| 1g | US1/AC8 — Save error |
| 2a | US2/AC1 — Target capabilities distinct |
| 2b | US2/AC2 — Target connection saved |
| 2c | US2/AC3 — Duplicate target warning |
| 3a | US3/AC1 — List view |
| 3b | US3/AC2 — Edit resets status |
| 3c, 3d | US3/AC5, US3/AC6 — Credential rotation + masking |
| 3e | US3/AC3 — Delete confirmation |
| 3f | US3/AC4, FR-009 — Delete blocked |

---

## Security Spot-Checks

These checks must be run in addition to functional tests:

1. **Credentials in network tab**: After saving a connection, inspect browser
   DevTools Network panel — the `configuration` field must not appear in any
   response payload.

2. **Credentials in server logs**: Save a connection and check application logs
   — no credential values should appear.

3. **SSRF with private IP**: Use `http://10.0.0.1/` as Server URL — must be
   rejected by SSRF guard before any network call.

4. **Viewer cannot edit**: Log in as a `viewer` user — Edit and Delete buttons
   must not be visible, and direct POST to upsert action must return 403.
