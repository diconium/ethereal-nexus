# CMS Connector Architecture (Meta CMS / Content Migration)

Source of truth for the **CMS Connector** subsystem powering Ethereal Nexus's
Content Migration feature. Read this before touching connectors, capabilities,
discovery, blueprints, or the Content UI.

---

## 0. The one big idea

**A Blueprint is a knowledge graph, not a JSON document or a list of entities.**

```
Connection → Connector → Capability Discovery → Blueprint Builder
   → Knowledge Graph (Nodes + Edges) → Snapshots → Changes → Mapping → Migration
```

Every object is a **node** (Page, Component, Field, Asset, Model, Template,
Language, Reference). Every relation is a typed **edge** (`contains`,
`references`, `inherits`, `uses`, `extends`, `belongsTo`, `localizedAs`,
`generatedFrom`). Once the graph exists:

- Mapping becomes graph-to-graph transformation.
- AI can reason over structure (via a semantic layer, not raw JSON).
- Blueprints compare naturally (diffs), dependencies visualize, and impact
  analysis ("what breaks if I migrate this component?") is straightforward.

## 0.1 Four bounded contexts (DDD — the Meta CMS)

The Meta CMS is four independent domains. **The Blueprint is immutable** — it
never holds Nexus IDs, mappings, or generated components.

```
Discovery (data/cms/)      → Blueprint (immutable graph: Components/ContentTypes/Layouts)
Design    (data/meta/design)→ Nexus Library (canonical Components/ContentTypes/Layouts in Nexus dialog schema, user-owned, project-scoped)
Mapping   (data/meta/mapping, future) → links Blueprint node → Library definition (+ field map + transforms), project-owned
Provision (data/meta/provision, future) → materializes Library-via-Mapping into a target CMS
```

- **Mapping is the ONLY link** between Discovery and Design. A Blueprint Hero in
  project A and a Banner in project B can both map to Nexus Hero without
  changing either Blueprint.
- **Meta Template = Layout**: a CMS-independent page composition (regions +
  component slots). Each connector maps its page concept ↔ Layout bidirectionally
  (AEM Editable Template / FS Page Template / Dato Page Model / Contentful Page
  Content Type ↔ Meta Layout).
- **Seeding**: `seedLibraryFromBlueprint` creates Design entities from a
  Blueprint (normalized to Nexus dialog schema). The Blueprint is never mutated.
- Design tables: `nexus_library`, `nexus_library_definition` (migration `0010`).
  Never touch the production `component`/`component_version` tables.

## 1. Terminology (canonical)

- **Connector** — knows how to talk to a specific CMS. Has a **Manifest** and
  implements `CMSConnector`.
- **Connection** — a configured Connector instance (URL + credentials +
  options), stored encrypted. Carries **Capabilities** + **Health**.
- **Blueprint Definition** — the *stable structure* of a CMS: components,
  templates, content(-fragment) models, allowed components, dialogs, policies,
  relationships. Changes rarely. One per connection (+ project).
- **Blueprint Snapshot** — the *discovered state* at a point in time: pages,
  assets, content, references, languages, statistics, hierarchy. Changes every
  discovery. Many per Definition (versioned, Git-like).
- **Blueprint Change** — the computed diff between consecutive snapshots
  (+/- nodes, edges, fields, languages).
- **Node / Edge** — the graph primitives that make up Definition + Snapshot.
- **Feature** — a rich capability descriptor a connector exposes (see §6).
- **Capabilities** — what a *connection* actually supports (discovered live).
- **Mapping** — rules transforming one Blueprint graph into another (future).
- **Migration Job** — executes a Mapping between two Connections (future).

> Naming: we use **Connector** (not "Provider") and **Blueprint Builder** (not
> "Discovery Engine") — clearer, scales as Meta CMS grows.

## 2. Pipeline & engines

```
             Nexus Core (CMS-agnostic)
 Connection Mgmt · Validation · Capability Discovery
 Blueprint Builder · Diff Engine · Mapping · Migration
                        │
                CMSConnector + Manifest
      ┌───────────┬──────────────┬───────────────┐
     AEM       FirstSpirit      Strapi        (future)
```

**Golden rules**

1. Nexus Core MUST NOT contain CMS-specific logic. No `switch (cms)` in engines
   or UI — drive everything from the **Manifest** + **Capabilities**.
2. Every CMS specific belongs inside a Connector.
3. Engines only **execute tasks / read the graph**; they don't know how any CMS
   works.
4. Every Connector emits the same graph primitives (Nodes + Edges) and the same
   normalized `Feature`/`Capabilities` shapes.
5. Mapping/Migration consume the **graph**, never a CMS directly.

## 3. Separation of concerns (points 1, 4, 7, 10)

- **Validation** — is the connection usable? (reachable, authenticated, CMS
  detected). Fatal failures short-circuit.
- **Capability Discovery** — what does this connection *support*? (Cloud vs
  on-prem, GraphQL, Assets API, Content Fragments, Editable Templates,
  Translation, Publishing, Workflow). Runs once after Validation; **reusable
  forever** by later engines (e.g. Migration asks `supports('graphql')`).
- **Blueprint Builder** — builds the Definition graph + a Snapshot graph and
  computes Changes.

Flow: `Connect → Validate → Capability Discovery → Blueprint Builder →
Snapshot → Diff → Mapping`.

## 4. Discovery scopes are GENERIC (point 3)

The Builder thinks in CMS-neutral scopes; the connector translates each into
CMS-specific tasks. Never name a scope after a CMS concept.

Generic scopes: `structure`, `content-types`, `relationships`, `assets`,
`metadata`, `languages`, `permissions`.

Example: scope `content-types` → AEM discovers Components/Templates/CF Models;
Strapi discovers Collection/Single Types/Components. Adding a CMS never adds new
scope names.

## 5. Graph model (points 1, 2, 9)

Definition/Snapshot/Node/Edge/Change, Git-like:

```
BlueprintDefinition (stable structure, 1 per connection+project)
   └── DefinitionNode / DefinitionEdge   (components, templates, models, rels)
BlueprintSnapshot (per discovery run, versioned)
   ├── SnapshotNode / SnapshotEdge       (pages, assets, content, languages…)
   └── BlueprintChange[]                 (diff vs previous snapshot)
```

Node: `{ externalId, kind, name, layer, attributes }` where `kind ∈` site,
page, component, field, asset, assetFolder, model, template, editableTemplate,
policy, dialog, language, reference, resourceType, graphqlSchema; `layer ∈`
`definition | snapshot`.
Edge: `{ fromExternalId, toExternalId, type }` where `type ∈` contains,
references, inherits, uses, extends, belongsTo, localizedAs, generatedFrom.
Nodes/edges reference each other by `externalId` (connector-stable id, usually
the JCR path). Persisted rows live under a snapshot; the `layer` column marks
whether a node is part of the stable Definition or the Snapshot state.

Diff is computed automatically on each snapshot and stored as
`BlueprintChange` rows (+2 Components, -1 Template, +18 Fields, +1 Language,
relationship changed). This is a killer feature — always keep it working.

## 6. Connector Manifest + Features (points 5, 6)

Every connector ships a **Manifest** so the UI is fully dynamic (no switch
statements):

```ts
export const manifest: ConnectorManifest = {
  id: 'aem',
  name: 'Adobe Experience Manager',
  logo: 'aem',
  authentication: ['basic', 'oauth'],
  minimumVersion: '6.5',
  documentation: '...',
  supports: { assets: true, pages: true, components: true,
              templates: true, graphql: true, /* … */ },
};
```

`features(): Feature[]` replaces `capabilities()`. A Feature is rich:
`{ id, name, supported, readOnly?, version?, requires?[] }` — so Migration can
choose exporters/importers based on real support.

## 7. Connection Health (point 8)

Every connection surfaces a **Health** object for dashboards:
`{ score: number; warnings: number; missingCapabilities: number;
   authExpiresInDays?: number; status }`. Derived from validation +
capabilities. Show on cards ("Health 98% · 1 warning · auth expires 15 days").

## 8. Semantic / AI layer (point 11)

AI must NOT read raw graph JSON. Reserve a **Semantic Layer** that projects the
graph into semantic objects for AI/mapping. Not built yet — keep the boundary:
`Blueprint (graph) → Semantic Layer → AI`.

## 9. Code map (`web/dashboard/src/data/cms/`)

| File | Responsibility |
|------|----------------|
| `types.ts` | Graph + domain types: Node/Edge/Definition/Snapshot/Change, Feature, Capabilities, Health, NexusTree. |
| `manifest.ts` | `ConnectorManifest` type + registry of manifests (drives dynamic UI). |
| `connector.ts` | `CMSConnector` interface: `manifest`, `metadata()`, `features()`, `validationTasks()`, `capabilityProbes()`, `discoveryTasks()` (each tagged with a generic scope, returning `ScopeOutput` = nodes+edges), `authenticate/validateConnection/discoverProjects/export/import/publish`. Also `ValidationTask`, `CapabilityProbe`, `DiscoveryTask`, `ConnectorContext`. |
| `config.ts` | `CMS_CONNECTOR_KEYS` (`z.enum`) + per-type config Zod schemas + `CMS_CONNECTOR_OPTIONS`. |
| `capabilities.ts` | `CAPABILITY_LABELS`, `supports()`, `capabilityStats()`, `isFeatureUsable()`. |
| `graph.ts` | `NODE_KIND_LABELS`, `EDGE_TYPE_LABELS`, `diffGraph()`, `summarizeChanges()`. |
| `manifest.ts` | `ConnectorManifest` type + `CONNECTOR_MANIFESTS` registry + `getManifest/listManifests` (client-safe, drives dynamic UI). |
| `connectors/index.ts` | Registry key → connector (`getConnectorOrThrow`). |
| `connectors/<cms>/` | Connector impls (+ `client.ts` for HTTP, e.g. `aem/client.ts`). |
| `schema.ts` | Drizzle: `cms_provider`, `cms_connection` (+`capabilities`/`health` jsonb), `cms_connection_validation`, `cms_discovery_job`, `cms_blueprint_definition`, `cms_blueprint_snapshot`, `cms_blueprint_node`, `cms_blueprint_edge`, `cms_blueprint_change`. |
| `dto.ts` | drizzle-zod + capability/health/validation/capability-run/build-run/view/detail (graph groups+items+edges+changes) DTOs. |
| `actions.ts` | Engines as `'use server'` actions: `get/upsert/deleteCmsConnection`, `validateCmsConnection`, `discoverCapabilities` (runs `capabilityProbes` + caches health), `getConnectionProjects`, `buildBlueprint` (Builder: runs scoped discovery → persists definition+snapshot+nodes+edges, computes+persists changes), `getBlueprints`, `getBlueprintDetail`, `deleteBlueprint`. |
| `task-metadata.ts` | Client-safe validation-task, capability-probe, and generic discovery-scope labels for the wizard. |
| `../../lib/crypto.ts` | AES-256-GCM for connection secrets. |

UI: `web/dashboard/src/components/projects/content/*`. Routes:
`web/dashboard/src/app/(session)/projects/[id]/content/*`.

## 10. Conventions & guardrails

- Server actions return `ActionResponse<T>`; `auth()` → `safeParse` →
  `try/catch` → re-parse DB rows with select schemas.
- DB `provider` stays extensible `text`; validate at the Zod layer.
- Secrets require `CMS_CONNECTOR_ENCRYPTION_KEY` (32-byte base64). Never store
  plaintext; never ship connector code to the client.
- UI is shadcn/ui + lucide only, dynamic from Manifest/Capabilities.
- Register new schema modules in `web/dashboard/src/db/index.ts` (spread into
  the `schema` object — `import * as cms` already picks up new table exports).
- Migrations live in `web/dashboard/drizzle/`; generate with `npm run
  db:generate`, apply with `npm run db:migrate` (dev may use `db:push`).
  The graph model was introduced in `0009_flawless_tarantula.sql` (creates the
  5 `cms_blueprint_*` tables, drops the old `cms_blueprint`/`cms_blueprint_entity`
  tables, adds `cms_connection.capabilities`/`health` + `cms_discovery_job.snapshot_id`).

## 11. Adding a new CMS connector (checklist)

1. Add key + config schema in `config.ts`; add a **Manifest** in `manifest.ts`.
2. Create `connectors/<key>/index.ts` implementing `CMSConnector`: `manifest`,
   `features()`, `validationTasks()`, `capabilityProbes()`, and
   `discoveryTasks()` (each tagged with a generic scope, returning
   `ScopeOutput` = Nodes+Edges).
3. Register in `connectors/index.ts`. Add a logo in
   `components/projects/content/cms-logos.tsx`. Add validation/capability/scope
   labels in `task-metadata.ts`.
4. No Nexus Core / UI switch changes required (UI reads the Manifest). The
   `discoverCapabilities`/`buildBlueprint` engine actions run the connector's
   probes/tasks generically.

## 12. Status

- **Graph model**: live. Definition + versioned Snapshots + Nodes/Edges +
  computed Changes (diff) all persisted and read by the UI.
- **AEM**: validation, capability probes, and discovery via real HTTP
  (QueryBuilder / Sling JSON). Emits nodes + some edges (site→page `contains`,
  component→superType `inherits`).
- **Strapi / FirstSpirit**: conform to the v2 contract (manifest, features,
  capability probes, generic scopes) but network calls are stubbed.
- **Connection Health**: derived + cached during Capability Discovery; shown on
  connection cards. (Blueprint-detail health ring is currently static 100%.)
- **Design domain (Phase 1) DONE**: Nexus Library (`data/meta/design`) — types,
  normalization (blueprint fields/regions → Nexus dialog + Meta Layout),
  `nexus_library*` tables, `getNexusLibrary`/`seedLibraryFromBlueprint`, and the
  Nexus Library explorer UI at `content/model`. Blueprint stays immutable.
- **Mapping / Provision domains (Phase 2/3)**: planned; not yet implemented.
- **Migration / Export / Import / Publish / Semantic layer**:
  interfaces reserved; implementations pending.
- **UI actions** Re-discover / Export / Compare / Import / View Report are
  visual only. Validate / Capabilities / Discover / Delete / Open work.

## 13. Roadmap

Near-term: real Strapi/FirstSpirit; richer AEM graph (dialog fields, CF model
fields, page hierarchy, allowed components edges); pagination beyond caps.
Mid-term: Mapping Engine (graph→graph), Migration Jobs with background runner +
progress, snapshot history UI + visual diff, dependency/impact visualization.
Long-term: more connectors (Contentful, DatoCMS, Sanity, Storyblok, Magnolia),
scheduled re-discovery + drift detection, Semantic Layer + AI reasoning,
Nexus Tree export/import + publishing.

## 14. Non-goals

- No CMS branching in engines/UI — use Manifest + Capabilities.
- No bypassing the graph from mapping/migration.
- No unencrypted credentials; no connector code on the client.
