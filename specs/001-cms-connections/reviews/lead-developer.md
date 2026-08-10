# Lead Developer Review: CMS Connections — Source and Target Configuration (Rev 2)

**Feature**: [spec.md](../spec.md)
**Reviewer**: Lead Developer Agent
**Created**: 2026-08-10
**Revision**: 2 — AEM implementation scope update
**Status**: Complete

---

## Verdict

**APPROVED** — The AEM connector implementation is technically feasible within the
existing architecture. The `CMSConnector` interface already defines all four methods;
the `aemRequest` client already handles auth headers, timeouts, and self-signed TLS.
The work is well-bounded and uses established AEM APIs. Key constraints and risks are
documented below.

---

## Architectural Fit

All four methods fit cleanly within the existing connector architecture:

- `authenticate()` — uses `aemRequest()` which already handles Basic and OAuth bearer
  auth headers. A real implementation calls `/libs/granite/core/content/login.html` or
  `/bin/wcmcommand` to verify credentials; a simpler probe is to hit any
  authenticated endpoint (e.g. `/api/assets.json`) and check the HTTP status.
- `export()` — builds on `aemQueryBuilderHits`, `aemListChildren`, and `aemFetchJson`
  which are already implemented and battle-tested in the discovery tasks. Traversal of
  the page tree uses the same QueryBuilder mechanism as `discoverProjects()`.
- `import()` — uses the Sling POST servlet (`POST <path>` with form-encoded fields).
  The `aemRequest` client supports `method: 'POST'` and `body`/`contentType` options.
  No new HTTP primitives needed.
- `publish()` — AEM Replication API: `POST /bin/replicate.json` with
  `cmd=Activate&path=<path>`. Directly supported by `aemRequest`.

No new files are strictly required — all changes can live in `connectors/aem/index.ts`
and `connectors/aem/client.ts`. However, given the file is already 1063 lines, it is
advisable to extract `export`, `import`, and `publish` logic into dedicated files
(`export.ts`, `import.ts`) for maintainability.

---

## Reusable Assets Identified

| Asset | Location | How It Applies |
|---|---|---|
| `aemRequest()` | `connectors/aem/client.ts` | Base HTTP client for all four methods |
| `aemQueryBuilderHits()` | `connectors/aem/client.ts` | Page/asset tree traversal for `export()` |
| `aemFetchJson()` | `connectors/aem/client.ts` | Fetching node metadata for `export()` |
| `aemListChildren()` | `connectors/aem/client.ts` | Listing content children for `export()` |
| `resolveConnectionConfig()` | `connectors/aem/index.ts` | Config resolution pattern to reuse |
| `mapLimit()` | `connectors/aem/index.ts` | Concurrent request limiting (already in use) |
| `NexusTree`, `NexusNode` | `types.ts` | Output type for `export()` |
| `ImportResult` | `types.ts` | Output type for `import()` |

---

## Method-by-Method Technical Assessment

### `authenticate(ctx): Promise<AuthResult>`

**Implementation**: Call a lightweight authenticated AEM endpoint to verify credentials.
The `/api/assets.json` endpoint or `/bin/querybuilder.json?p.limit=0` are both suitable
— they require valid auth and return quickly.

**Return**: `{ ok: true, token?: string, expiresAt?: string }`. AEM Basic auth has no
token; OAuth bearer tokens have expiry — populate `expiresAt` from the token payload
if OAuth is used.

**Risk**: Low. The validation tasks already do this implicitly — `authenticate()` is
just a lightweight version.

---

### `export(ctx, options): Promise<NexusTree>`

**Implementation**: Traverse the AEM content tree for `options.projectId` (the site
root under `/content/<projectId>`). Build a `NexusTree` from:
- Root: the site node
- Children: `cq:Page` nodes (pages) — use `aemQueryBuilderHits` with `path` and
  `type: cq:Page`, paginating with `p.offset`
- Leaf nodes: asset references found in `jcr:content` via `aemFetchJson`

**Depth limit**: Per the PO recommendation, export captures page structure and JCR
metadata (titles, paths, `sling:resourceType`, asset references) — not full rich text
content body. Full content body export belongs in story 008.

**Risk**: Medium — large AEM sites may have thousands of pages. Must implement
pagination using QueryBuilder's `p.offset` + `p.limit` and cap at a reasonable depth
(e.g. 5 levels) for the connection-level export. A progress callback or streaming
approach is not needed at this stage; the operation runs server-side.

**Timeout concern**: The 10s connection test timeout (NFR-002) is for validation tasks.
`export()` is not called from the connection test — it is called from story 008's
migration flow. No timeout conflict.

---

### `import(ctx, tree): Promise<ImportResult>`

**Implementation**: For each `NexusNode` in the tree, issue a `POST` to the Sling
POST servlet at the node's path. Sling POST creates or updates JCR nodes:

```
POST /content/<path>
Content-Type: application/x-www-form-urlencoded

jcr:primaryType=cq:Page&jcr:content/jcr:title=<title>&...
```

The `aemRequest` client already supports `method: 'POST'`, `body`, and `contentType`.

**Risk**: Medium — Sling POST requires write access. The connection must have a `target`
role with write capability. The Server Action must validate `role === 'target'` before
calling `import()`. Error handling must be per-node (partial failures are expected).

---

### `publish(ctx, ids): Promise<void>`

**Implementation**: `POST /bin/replicate.json` with:
```
cmd=Activate&path=<path1>&path=<path2>...
```

AEM's replication servlet accepts multiple paths in a single request. Batch in groups
of 50 to avoid request size limits.

**Risk**: Low — well-documented AEM API. Requires the `publishing` capability to be
supported (already probed in `capabilityProbes`).

---

## Security Considerations

**SSRF**: `aemRequest()` currently has no SSRF protection. The SSRF guard utility
(`src/lib/ssrf-guard.ts` — new in this story) MUST be called at the top of
`aemRequest()` or in each connector method before any `fetch`. This applies to
`authenticate()`, `export()`, `import()`, and `publish()`.

**Import write access**: `import()` writes JCR nodes to AEM. The connector MUST
verify that the connection has `target` role and write capability before executing
any Sling POST requests. An `import()` called on a source-role connection must
return an error, not silently succeed or fail.

**Credential handling**: All four methods go through `aemRequest()` which uses
`authHeaders()`. The raw auth credentials never appear in responses or logs — the
existing pattern is correct.

---

## Performance Considerations

**`export()` pagination**: QueryBuilder results must be paginated. Use `p.limit: 500`
and iterate with `p.offset` until all results are collected. Cap at 10,000 nodes
total — larger exports belong in a dedicated background job (story 008).

**`import()` concurrency**: Use `mapLimit` (already available in the file) to limit
concurrent Sling POST requests to 10 at a time. AEM's POST servlet is synchronous
and does not benefit from high concurrency.

**`publish()` batching**: Group node IDs into batches of 50 per replication request.

---

## Testing Implications

| Layer | Required | Scope |
|---|---|---|
| Jest + Testing Library | Yes | `authenticate()` — real HTTP probe, success/failure; `export()` — tree traversal, pagination, depth cap; `import()` — Sling POST per node, partial failure handling; `publish()` — replication API, batching |
| Playwright E2E | No new tests | AEM connector methods are not directly testable via the connection management UI — they are called from story 008 flows |
| MSW | Yes | Mock AEM endpoints for unit tests (`/_health`, `/api/assets.json`, `/bin/querybuilder.json`, Sling POST, `/bin/replicate.json`) |

---

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AEM `export()` returns very large tree for production sites | Medium | Medium | Cap at 10,000 nodes and 5 levels depth; document limit in code |
| `import()` Sling POST fails on protected AEM paths (e.g. `/libs/`) | Medium | Low | Skip protected paths; log as warning, not error |
| AEM replication queue backpressure causes `publish()` to time out | Low | Medium | Return success once replicate.json accepts the request; actual publish is async on AEM side |
| `authenticate()` probe endpoint varies across AEM versions | Low | Low | Try multiple probe endpoints in order; log which succeeded |
| SSRF guard not applied to existing AEM methods | High | High | Wire SSRF guard into `aemRequest()` itself — single fix covers all methods |

---

## Technical Debt Interactions (Principle 14)

1. **`next-auth` beta** — Not applicable.
2. **`@changesets` pre-release** — Not applicable.
3. **`auth.config.ts` debug** — Not applicable; no auth config changes.
4. **Keycloak introspection** — Not applicable.
5. **`@webcomponent` data-css-urls** — Not applicable.
6. **Unimplemented stubs** — **Directly applicable.** `authenticate()`, `export()`,
   `import()`, `publish()` in `aem/index.ts` are all stubs with `delay()`. This story
   resolves them. Constitution P14-6: PRs must not ship UI implying functionality is
   live while stubs remain. The AEM connector's `export-content` and `export-assets`
   features are currently marked `supported: true, readOnly: true` in `features()` —
   this is misleading while `export()` is a stub. Either set `supported: false` until
   the implementation is complete, or complete the implementation before the PR merges.
7. **AI schema** — Not applicable.
8. **Blueprint immutability** — Not applicable.
9. **Edge Runtime** — Not applicable; all four methods run server-side.
10. **Storage backend** — Not applicable; no asset URL changes.
11. **Cross-Origin headers** — Not applicable.
12. **`db` vs `dbUncached`** — Not applicable; connector methods do not touch the DB.
13. **`member.resource` no FK** — Not applicable.
14. **`workspace:*` publishing** — Not applicable.

---

## Recommended Plan Constraints

1. **MUST wire SSRF guard into `aemRequest()`** — not per-method. Single call in the
   HTTP client protects all current and future AEM methods automatically.

2. **MUST fix `features()` before PR merges** — set `export-content` and
   `export-assets` to `supported: false` until `export()` is implemented, OR complete
   `export()` as part of this PR. Do not ship with `supported: true` and a stub body.

3. **`export()` MUST be depth-limited** — cap at 10,000 nodes and 5 levels to prevent
   runaway traversal on large production sites. Document the cap in code comments.

4. **`import()` MUST validate target role** — Server Action MUST verify
   `connection.role === 'target'` before calling `import()`. Connector method MUST
   also guard against write operations on source connections.

5. **`publish()` batching** — group paths into batches of 50 per `/bin/replicate.json`
   request. Do not send all paths in a single request.

6. **Extract into dedicated files** — Given `aem/index.ts` is already 1063 lines,
   `export`, `import`, and `publish` logic SHOULD be extracted to `aem/export.ts`,
   `aem/import.ts`, and `aem/publish.ts` for maintainability.
