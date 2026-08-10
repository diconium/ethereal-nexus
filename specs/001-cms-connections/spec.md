# Feature Specification: CMS Connections — Source and Target Configuration

**Feature Branch**: `001-cms-connections`

**Created**: 2026-08-10

**Status**: Reviewed — ready for planning (Rev 2)

**Epic**: [CMS Migration](../000-cms-migration-epic/epic.md)

**Input**: User description: "CMS Connections — Source and Target Configuration. Users need to configure and validate connections to source and target CMS platforms before any discovery or migration can begin. A connection defines the CMS type, endpoint, credentials, and the specific capabilities available for that connection such as read access for discovery, write access for provisioning, and asset transfer support. Connections must be testable before they can be used in a migration. The AEM connector currently has stub implementations for authenticate, export, import, and publish that need to be completed with real HTTP calls."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Configure a Source CMS Connection (Priority: P1)

A project administrator needs to connect Ethereal Nexus to an existing source CMS so that
Nexus can later discover its content structure. They choose the CMS type, provide the
endpoint URL and credentials, and confirm which capabilities the connection will use
(read access for discovery, asset access for migration).

**Why this priority**: Without a valid source connection, no discovery, blueprint, or
migration can take place. This is the foundational gate for the entire CMS Migration epic.

**Independent Test**: Can be fully tested by configuring a Strapi or AEM source
connection end-to-end — entering credentials, triggering a connection test, and confirming
the connection status is saved and displayed as validated — without any other migration
story being present.

**Acceptance Scenarios**:

1. **Given** a project exists and the user has `write` permission, **When** they navigate
   to the Connections section and choose to add a source connection, **Then** they are
   presented with a form that requires CMS type selection, endpoint URL, and credentials,
   and a list of capabilities to enable.

2. **Given** a connection form is filled with valid Strapi credentials, **When** the user
   triggers "Test Connection", **Then** Nexus contacts the Strapi endpoint, confirms
   connectivity and credential validity, and displays a success status with the detected
   capabilities.

3. **Given** a connection form is filled with invalid credentials, **When** the user
   triggers "Test Connection", **Then** Nexus displays a clear error message describing
   why the connection failed (unreachable endpoint, authentication failure, insufficient
   permissions) without exposing raw credentials in the error output.

4. **Given** a connection has been successfully tested, **When** the user saves it,
   **Then** the connection is stored with its validated status, selected capabilities, and
   CMS type, and appears in the project's Connections list.

5. **Given** a saved connection's credentials change on the remote CMS, **When** the user
   views the connection, **Then** the connection status reflects that re-validation is
   required before the connection can be used in a migration.

6. **Given** a project has no connections configured yet, **When** a user with `write`
   permission navigates to the Connections section, **Then** they see an empty state with
   a clear description of what connections are used for, a prominent call-to-action to add
   the first connection, and brief guidance indicating that both a source and a target
   connection are needed before a migration can begin.

7. **Given** a user successfully saves a connection, **When** the save completes, **Then**
   the system displays a confirmation message and the user is returned to the Connections
   list where the new connection is visible.

8. **Given** a user triggers the save action, **When** the save fails due to a system
   error, **Then** the user sees a clear error message, the connection form remains open
   with their data intact, and no partial record is created.

---

### User Story 2 — Configure a Target CMS Connection (Priority: P1)

A project administrator needs to connect Ethereal Nexus to the target CMS where migrated
content will be provisioned. The target connection requires write access for provisioning
and must declare which write capabilities are available (structure creation, content
publishing, asset upload).

**Why this priority**: The target connection is equally required before any provisioning
or content migration can happen. It is parallel in priority to the source connection and
must be treated with the same rigour.

**Independent Test**: Can be fully tested by configuring a target connection independently
of any source connection — verifying that the capability set for target connections
(write/provision/asset upload) is distinct from source connections (read/discover).

**Acceptance Scenarios**:

1. **Given** a user opens the "Add Connection" form, **When** they select the connection
   role using a required role selector field (source or target) presented at the top of
   the form, **Then** the capability options displayed update to reflect the selected role —
   source capabilities (read/discover) for source, target capabilities
   (write/provision/asset-upload) for target.

2. **Given** a valid target connection is configured and tested, **When** the user saves
   it, **Then** it is marked as the target connection and is available for selection in
   the Provision Plan stage.

3. **Given** a project already has a target connection, **When** the user attempts to add
   a second target connection of the same CMS type, **Then** they are warned that a target
   connection already exists and asked whether they want to replace it or add an additional
   one.

---

### User Story 3 — Manage and Re-validate Existing Connections (Priority: P2)

A project administrator needs to view all configured connections, understand their current
validation status, edit their credentials or capabilities, and remove connections that are
no longer needed.

**Why this priority**: Connection lifecycle management is necessary but not blocking. A
user can begin discovery with a single validated connection; management features improve
operational quality without gating the core migration path.

**Independent Test**: Can be tested independently by creating connections, viewing the
list, editing a connection's endpoint, re-validating, and deleting a connection — without
running any discovery or migration.

**Acceptance Scenarios**:

1. **Given** a project has multiple connections, **When** the user views the Connections
   section, **Then** they see a list showing each connection's CMS type, role (source or
   target), validation status, and last validated timestamp.

2. **Given** a connection exists, **When** the user edits its endpoint or credentials and
   saves, **Then** the connection status is reset to "requires validation" and the previous
   validated status is cleared until a new successful test is run.

3. **Given** a connection is not currently used by any active migration job, **When** the
   user chooses to delete it, **Then** the system presents a confirmation dialog naming the
   connection and warning that the action cannot be undone. Only after explicit confirmation
   is the connection removed and no longer visible in the list.

4. **Given** a connection is currently referenced by an active or pending migration job,
   **When** the user attempts to delete it, **Then** the system prevents deletion and
   explains which job is using the connection.

5. **Given** a validated connection exists and the user needs to rotate its credentials,
   **When** the user edits only the credential fields and saves, **Then** the previous
   credential is replaced, the connection status resets to `unvalidated`, and the
   validation history records that a credential update occurred. The user is prompted
   to re-run the connection test to restore `valid` status.

6. **Given** a user opens the edit form for an existing connection, **When** the form
   is displayed, **Then** the credential fields are empty and masked — the stored
   credential value is never pre-populated. The user must re-enter credentials to
   change them.

---

### Edge Cases

- What happens when the target CMS endpoint is reachable but returns an unexpected
  response format (wrong API version, maintenance mode)?
- What happens when credentials are saved but the CMS removes the API key between save
  and next use?
- What happens when a user has `read` permission on a project but attempts to add or
  edit a connection?
- What happens when two users simultaneously edit the same connection?
- What happens when the connection test times out due to a slow or unreachable endpoint?
- What happens when the same endpoint URL is configured twice with different credentials?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users with project `write` permission MUST be able to create a new CMS
  connection by selecting a CMS type, providing an endpoint URL, and entering credentials.

- **FR-002**: The system MUST support the following CMS connector types in this story:
  Strapi, AEM, and Contentful. The connector architecture MUST allow additional types to be
  added without modifying existing connectors.

- **FR-003**: Each connection MUST declare a role: `source` (read/discover capabilities)
  or `target` (write/provision/asset-upload capabilities). A connection's available
  capability options MUST be filtered to match its declared role.

- **FR-004**: Users MUST be able to trigger a "Test Connection" action that actively
  contacts the remote CMS endpoint, validates credentials, and returns the set of
  confirmed available capabilities.

- **FR-005**: The system MUST store connection credentials in an encrypted form. Credentials
  MUST NOT be returned in plaintext in any API response or displayed in the UI after initial
  entry.

- **FR-006**: A connection MUST have a validation status: `unvalidated`, `valid`, or
  `invalid`. Only connections with a `valid` status MAY be used in Discovery or Provisioning
  stages. The status MUST be updated each time a test is run.

- **FR-007**: Users MUST be able to view a list of all connections for a project, showing
  CMS type, role, validation status, and last validated timestamp.

- **FR-008**: Users MUST be able to edit a connection's endpoint, credentials, or
  capabilities. Editing MUST reset the validation status to `unvalidated`.

- **FR-009**: Users MUST be able to delete a connection that is not actively referenced
  by a running or pending migration job. The system MUST prevent deletion of in-use
  connections with a clear explanation.

- **FR-010**: The system MUST record a validation history entry each time a connection
  test is performed, capturing timestamp, outcome, and a summary of detected capabilities.

- **FR-011**: The Strapi connector MUST implement actual network calls for credential
  validation and capability detection. The Strapi connector is already fully implemented
  with real HTTP — this requirement is satisfied. No further work required.

- **FR-012**: The AEM connector MUST have all four remaining stub methods replaced with
  real HTTP implementations:
  - `authenticate()` MUST make a real HTTP request to the AEM author URL to verify
    credentials and return a valid `AuthResult` including token lifetime where available.
  - `export()` MUST traverse the AEM content repository for the configured project and
    return a `NexusTree` representing the page hierarchy, content, and asset references.
  - `import()` MUST accept a `NexusTree` and create or update AEM content nodes via
    the Sling POST servlet, returning an `ImportResult` with counts of created, updated,
    and failed nodes.
  - `publish()` MUST trigger AEM replication for the specified node IDs using the
    AEM Replication API (`/bin/replicate.json`), activating them to the publish tier.

- **FR-013**: The Contentful connector MUST implement actual network calls for credential
  validation and capability detection. The Contentful connector is already fully implemented
  with real HTTP — this requirement is satisfied. No further work required.

### Non-Functional Requirements *(include when relevant)*

- **NFR-001**: Credentials MUST be encrypted at rest using the existing AES-GCM encryption
  pattern already used by `cms_connection` in the data model. No alternative encryption
  approach is permitted.

- **NFR-002**: A connection test MUST complete within 10 seconds or time out with a clear
  user-facing message. The UI MUST show a loading state for the duration of the test.

- **NFR-003**: Only users with project-level `write` or `manage` permission MUST be able
  to create, edit, or delete connections. Users with `read` permission MUST be able to
  view connection status but not modify connections.

- **NFR-004**: Connection credentials MUST NOT appear in application logs, error messages,
  or API responses at any verbosity level.

- **NFR-005**: The connector interface MUST be designed so that adding a new CMS type
  requires only implementing a defined contract — no changes to the connection management
  UI or storage layer.

- **NFR-006**: All save actions (create and edit) MUST show a loading state while in
  progress. If a save fails, the system MUST display a user-facing error message and
  preserve the user's unsaved input so they do not lose their work.

- **NFR-007**: Credential input fields MUST behave as masked inputs throughout the
  connection form. After a connection is saved, credential values MUST NOT be
  pre-populated in the edit form. Users must re-enter credentials explicitly to change
  them. Credential values MUST NOT be readable via browser developer tools or
  autocomplete.

- **NFR-008**: Before making any outbound network request during a connection test, the
  system MUST validate that the endpoint URL does not resolve to a private IP range
  (e.g., 10.x.x.x, 172.16–31.x.x, 192.168.x.x), localhost (127.0.0.1, ::1), or
  cloud metadata endpoints (e.g., 169.254.169.254). Requests to disallowed endpoints
  MUST be rejected with a clear user-facing error before any network call is made.

### Key Entities *(include if feature involves data)*

- **CMS Provider**: A registered CMS type that Nexus supports as a connector (e.g.,
  Strapi, AEM, Contentful). Defines the connector contract and available capability types.

- **CMS Connection**: A project-scoped configuration linking a CMS Provider to a specific
  endpoint and credentials. Has a role (source or target), a validation status, an
  encrypted credential payload, and a declared set of enabled capabilities.

- **Connection Capability**: A specific action a connection permits Nexus to perform —
  e.g., `discover:read`, `provision:write`, `assets:read`, `assets:write`. Capabilities
  are declared by the connector and confirmed during validation.

- **Connection Validation**: A timestamped record of a test run against a connection,
  capturing the outcome (success/failure), detected capabilities, and any error details.

---

## Success Criteria *(mandatory)*

### Functional Success

- **SC-001**: A user can configure, test, and save both a source and a target CMS
  connection for a project without requiring technical assistance.

- **SC-002**: 100% of connection test outcomes (success and failure) are clearly
  communicated to the user with actionable feedback — no silent failures or generic
  error messages.

- **SC-003**: Connections with `valid` status can be selected for use in the Discovery
  stage (story 002). Connections with `unvalidated` or `invalid` status are not
  selectable for migration operations.

- **SC-004**: Strapi, AEM, and Contentful connectors successfully complete real network
  validation against live or test instances of each CMS. The AEM connector's
  `authenticate`, `export`, `import`, and `publish` methods are fully implemented with
  real HTTP calls — no stub implementations remain.

### User Experience Success

- **SC-005**: A user with no prior knowledge of Nexus can configure a connection and
  reach a validated status within 5 minutes, using only the UI and inline guidance.

- **SC-006**: All error states (timeout, wrong credentials, unreachable endpoint,
  insufficient permissions) present the user with a specific message and a suggested
  next action.

### Technical Success

- **SC-007**: Connection credentials are never exposed in plaintext in any log, API
  response, or browser developer tools network panel.

- **SC-008**: The connector interface is extensible — a third CMS connector can be
  added by a developer without modifying any existing connection management code.

---

## Assumptions

- The existing `cms_provider`, `cms_connection`, and `cms_connection_validation` schema
  tables are the correct foundation for this story. Schema changes are additive only —
  no existing columns are removed or renamed.

- The existing AES-GCM encryption used in `cms_connection.configuration` is the
  approved mechanism for credential storage and is already functional.

- "Credentials" for this story means API keys, tokens, or username/password pairs
  depending on the CMS type. OAuth flows are out of scope for this story.

- The Connections section lives within the existing `projects/[id]/content/` route
  area of the dashboard. No new top-level navigation is required.

- Users must be authenticated and have at minimum `write` project permission to manage
  connections. The existing two-layer RBAC model (user role + member permissions) is
  sufficient — no new permission types are needed.

- A project may have multiple source connections (e.g., staging and production instances
  of the same CMS) and multiple target connections. There is no hard limit of one per
  role, but the UI should make it clear when multiple connections of the same role exist.

- This story covers three connector types: Strapi (already fully implemented), AEM
  (authenticate/export/import/publish stubs to be replaced with real HTTP), and
  Contentful (already fully implemented). FirstSpirit is deferred to a future story.
  The connector architecture must support future additions.

- The `export()` AEM implementation in this story captures page structure, JCR metadata
  (titles, paths, `sling:resourceType`), and asset references — up to 10,000 nodes and
  5 levels of depth. Full rich text content body export is deferred to story 008
  (Content & Asset Migration).

- The AEM connector's `features()` declaration MUST accurately reflect implementation
  status at the time of merge. Features marked `supported: true` MUST have working
  implementations — not stubs. If `export()` is not complete when the PR merges,
  `export-content` and `export-assets` MUST be set to `supported: false`.

- Stories 002 (Discovery) through 009 (Validation) are out of scope for this story.
  The only downstream dependency from this story is that validated connections are
  available for selection in story 002.

- Selection of which source or target connection to use when initiating a Discovery
  or Provisioning job is out of scope for this story and will be addressed in
  story 002 (CMS Discovery — Trigger & Job Management).

- Validation history entries (FR-010) are stored in this story for future use.
  A dedicated UI for browsing validation history is deferred to story 003
  (Blueprint — Snapshot History & Visual Diff) or a later connection management
  enhancement.
