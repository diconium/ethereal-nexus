/**
 * Adobe Experience Manager connector (v2).
 *
 * - Validation: is the connection usable? (reachable, auth, AEM detected,
 *   read permissions). Real HTTP.
 * - Capability Discovery: what does the connection support? (cloud/on-prem,
 *   GraphQL, Assets API, Content Fragments, publishing, workflow). Real HTTP.
 * - Discovery: generic scopes translated into AEM queries, producing graph
 *   Nodes + typed Edges. Real HTTP (QueryBuilder / Sling JSON).
 */

import type {
  AuthResult,
  Capability,
  CMSMetadata,
  ExportOptions,
  Feature,
  FieldDef,
  GraphNode,
  ImportResult,
  NexusTree,
  Project,
  ScopeOutput,
  TaskResult,
  ValidationResult,
} from '../../types';
import type { ProvisionResult } from '@/data/meta/provision/types';
import { provisionNotSupported } from '../provision-unsupported';
import type {
  CapabilityProbe,
  CMSConnector,
  ConnectorContext,
  DiscoveryTask,
  ValidationTask,
} from '../../connector';
import { getManifest } from '../../manifest';
import { aemConfigSchema, type AemConfig } from '../../config';
import {
  aemRequest,
  aemQueryBuilderHits,
  aemListChildren,
  aemFetchJson,
  collectResourceTypes,
  collectAllowedComponents,
  type AemHit,
} from './client';
import { buildNexusTree } from './export';
import { importNexusTree } from './import';
import { replicateNodes } from './publish';

function resolveConfig(ctx: ConnectorContext): AemConfig {
  return aemConfigSchema.parse(ctx.config);
}

/**
 * Lenient config for connectivity-only operations (validation, capability
 * probing, project listing) that run before a project has been chosen.
 */
function resolveConnectionConfig(ctx: ConnectorContext): AemConfig {
  const raw = ctx.config as Record<string, unknown>;
  const project =
    typeof raw.project === 'string' && raw.project.trim()
      ? raw.project
      : '__pending__';
  return aemConfigSchema.parse({ ...raw, project });
}

function ok(status: number) {
  return status >= 200 && status < 400;
}

function hitProp(hit: AemHit, key: string): string | undefined {
  const top = hit.properties[key];
  if (typeof top === 'string') return top;
  const content = hit.properties['jcr:content'] as
    | Record<string, unknown>
    | undefined;
  const nested = content?.[key];
  return typeof nested === 'string' ? nested : undefined;
}

/** Map a Granite/Coral field resourceType to a friendly Nexus field type. */
function mapFieldType(resourceType: string): string {
  const rt = resourceType.toLowerCase();
  if (rt.includes('textfield')) return 'Text';
  if (rt.includes('textarea') || rt.includes('richtext')) return 'Rich Text';
  if (rt.includes('pathfield') || rt.includes('fileupload') || rt.includes('filereference'))
    return 'Reference (Asset)';
  if (rt.includes('numberfield')) return 'Number';
  if (rt.includes('checkbox') || rt.includes('switch')) return 'Boolean';
  if (rt.includes('select') || rt.includes('radiogroup')) return 'Select';
  if (rt.includes('datepicker')) return 'Date';
  if (rt.includes('button')) return 'Nested (Button)';
  if (rt.includes('multifield')) return 'List';
  return 'Text';
}

/**
 * Extract fields from a component's `cq:dialog` subtree. Granite fields carry a
 * `name` (usually `./fieldName`) and a `sling:resourceType`; `required=true`
 * marks required fields. Recursively walks the dialog tree.
 */
function extractFields(
  tree: Record<string, unknown> | undefined,
  acc: FieldDef[] = [],
  seen = new Set<string>(),
): FieldDef[] {
  if (!tree) return acc;
  for (const [key, value] of Object.entries(tree)) {
    if (key === 'jcr:content' && value && typeof value === 'object') {
      // Sling returns the dialog under jcr:content — descend into it.
      extractFields(value as Record<string, unknown>, acc, seen);
      continue;
    }
    if (key.startsWith('jcr:') || key.startsWith('rep:')) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const rec = value as Record<string, unknown>;
      const rt = typeof rec['sling:resourceType'] === 'string'
        ? (rec['sling:resourceType'] as string)
        : undefined;
      const rawName =
        typeof rec.name === 'string' ? (rec.name as string) : undefined;

      // A Granite field: a form widget resourceType (…/granite/ui/components/…/form/…)
      // Prefer nodes that carry a `name`, but also accept known field widgets.
      const isFormField =
        !!rt &&
        /\/form\//.test(rt) &&
        !/\/(container|tabs|fixedcolumns|columns|well|section)\b/.test(rt);

      if (rawName && (rt || isFormField)) {
        const cleanName = rawName
          .replace(/^\.\//, '')
          .replace(/^jcr:content\//, '')
          .replace(/^\.\.\//, '');
        if (cleanName && !seen.has(cleanName)) {
          seen.add(cleanName);
          const label =
            (typeof rec.fieldLabel === 'string' && (rec.fieldLabel as string)) ||
            (typeof rec['jcr:title'] === 'string' && (rec['jcr:title'] as string)) ||
            humanize(cleanName);
          acc.push({
            name: label,
            type: rt ? mapFieldType(rt) : 'Text',
            required: rec.required === true,
          });
        }
      }
      // Always recurse: fields live deep under items/tabs/columns/field nodes.
      extractFields(rec, acc, seen);
    }
  }
  return acc;
}

function humanize(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Extract a template's top-level structure regions. In AEM editable templates
 * the composition lives under `structure/jcr:content/root`; each direct child
 * container is a region. We surface its name + a best-effort "location" hint.
 */
function extractRegions(
  structure: Record<string, unknown> | undefined,
): string[] {
  if (!structure) return [];
  // Descend: structure -> jcr:content -> root
  const jcrContent =
    (structure['jcr:content'] as Record<string, unknown> | undefined) ??
    structure;
  const root =
    (jcrContent['root'] as Record<string, unknown> | undefined) ?? jcrContent;
  const regions: string[] = [];
  for (const [key, value] of Object.entries(root)) {
    if (key.startsWith('jcr:') || key.startsWith('cq:') || key.startsWith('sling:')) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const rec = value as Record<string, unknown>;
      const title =
        (typeof rec['jcr:title'] === 'string' && (rec['jcr:title'] as string)) ||
        humanize(key);
      // Heuristic location from the layout/behaviour where present.
      const layout =
        typeof rec.layout === 'string' ? (rec.layout as string) : undefined;
      const location = layout
        ? humanize(layout)
        : /header/i.test(key)
          ? 'Global'
          : /footer/i.test(key)
            ? 'Global'
            : /hero/i.test(key)
              ? 'Top'
              : /sidebar/i.test(key)
                ? 'Right'
                : /main|content/i.test(key)
                  ? 'Container'
                  : 'Content';
      regions.push(`${title}:${location}`);
    }
  }
  return regions;
}

/** Run async work over items with bounded concurrency. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/** Turn a resourceType like "stihl/components/content/hero" into "Hero". */
function humanizeResourceType(rt: string): string {
  const last = rt.split('/').filter(Boolean).pop() ?? rt;
  return humanize(last);
}

/* ----------------------------- validation ----------------------------- */

const validationTasks: ValidationTask[] = [
  {
    id: 'reachable',
    name: 'Server Reachable',
    description: 'Request the Author URL.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/', { withAuth: false });
      if (res.networkError) {
        return { status: 'error', message: res.errorMessage ?? 'Server unreachable' };
      }
      return { status: 'success', message: `HTTP ${res.status}` };
    },
  },
  {
    id: 'auth',
    name: 'Authentication',
    description: 'Authenticate with the supplied credentials.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/libs/granite/core/content/login.html', {
        withAuth: true,
      });
      if (res.networkError) {
        return { status: 'error', message: res.errorMessage ?? 'Request failed' };
      }
      if (res.status === 401 || res.status === 403) {
        return { status: 'error', message: 'Authentication failed' };
      }
      const method = config.auth.method === 'basic' ? 'Basic' : 'OAuth';
      return { status: 'success', message: `Authenticated (${method})` };
    },
  },
  {
    id: 'detect',
    name: 'AEM Detection',
    description: 'Detect Adobe Experience Manager.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/libs/granite/core/content/login.html', {
        withAuth: false,
      });
      if (res.networkError) {
        return { status: 'error', message: res.errorMessage ?? 'Request failed' };
      }
      const body = res.text ?? '';
      const detected =
        /granite|aem|adobe experience manager|coral/i.test(body) ||
        res.status === 200;
      return detected
        ? { status: 'success', message: 'Adobe Experience Manager detected' }
        : { status: 'error', message: 'AEM not detected at this URL' };
    },
  },
  {
    id: 'permissions',
    name: 'Read Permissions',
    description: 'Verify read access to core content trees.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      const paths = ['/content.json', '/content/dam.json', '/conf.json', '/apps.json'];
      const results = await Promise.all(
        paths.map((p) => aemRequest(config, p, { withAuth: true })),
      );
      const anyReachable = results.some((r) => !r.networkError);
      if (!anyReachable) {
        return { status: 'error', message: 'No content trees reachable' };
      }
      const denied = results.filter(
        (r) => r.status === 401 || r.status === 403,
      ).length;
      if (denied === results.length) {
        return { status: 'error', message: 'Read access denied' };
      }
      if (denied > 0) {
        return {
          status: 'warning',
          message: `${denied} of ${results.length} trees not readable`,
        };
      }
      return {
        status: 'success',
        message: `${results.length} content trees readable`,
      };
    },
  },
];

/* -------------------------- capability probes -------------------------- */

const capabilityProbes: CapabilityProbe[] = [
  {
    key: 'cloud',
    name: 'Cloud Service',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const isCloud = /adobeaemcloud\.com/i.test(config.authorUrl);
      return {
        key: isCloud ? 'cloud' : 'on-prem',
        supported: true,
        detail: isCloud ? 'AEM Cloud Service' : 'AEM on-prem / AMS',
      };
    },
  },
  {
    key: 'assets',
    name: 'Assets API',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/api/assets.json', { withAuth: true });
      return { key: 'assets', supported: !res.networkError && ok(res.status) };
    },
  },
  {
    key: 'content-fragments',
    name: 'Content Fragments',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/api/content/fragments.json', {
        withAuth: true,
      });
      return {
        key: 'content-fragments',
        supported: !res.networkError && ok(res.status),
      };
    },
  },
  {
    key: 'graphql',
    name: 'GraphQL',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/content/_cq_graphql/global/endpoint.json', {
        withAuth: true,
      });
      return { key: 'graphql', supported: !res.networkError && ok(res.status) };
    },
  },
  {
    key: 'editable-templates',
    name: 'Editable Templates',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/conf.json', { withAuth: true });
      return {
        key: 'editable-templates',
        supported: !res.networkError && ok(res.status),
      };
    },
  },
  {
    key: 'publishing',
    name: 'Publishing',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/bin/replicate.json', { withAuth: true });
      return {
        key: 'publishing',
        supported: !res.networkError && res.status !== 404,
      };
    },
  },
];

/* ------------------------------ discovery ------------------------------ */

function node(
  kind: ScopeOutput['nodes'][number]['kind'],
  externalId: string,
  name: string,
  layer: 'definition' | 'snapshot',
  attributes?: GraphNode['attributes'],
): ScopeOutput['nodes'][number] {
  return { kind, externalId, name, layer, attributes };
}

/**
 * Repository roots scoped to a single AEM project key (e.g. "stihl").
 * Discovery only reads within these trees, so one connection = one project.
 */
function projectPaths(projectId: string) {
  const key = projectId.replace(/^\/+|\/+$/g, '');
  return {
    key,
    content: `/content/${key}`,
    apps: `/apps/${key}`,
    conf: `/conf/${key}`,
    dam: `/content/dam/${key}`,
  };
}

/** Whether a resource type belongs to the project's own /apps tree. */
function isProjectResourceType(rt: string, key: string): boolean {
  return rt.startsWith(`${key}/`) || rt === key;
}

/** Framework resource types we never treat as project components. */
function isFrameworkResourceType(rt: string): boolean {
  return (
    !rt ||
    rt.startsWith('granite/') ||
    rt.startsWith('wcm/') ||
    rt.startsWith('cq/') ||
    rt.startsWith('core/wcm/') ||
    rt.startsWith('dam/')
  );
}

const discoveryTasks: DiscoveryTask[] = [
  {
    id: 'structure-sites',
    name: 'Discover Sites & Pages',
    scope: 'structure',
    async execute(ctx, projectId): Promise<ScopeOutput> {
      const config = resolveConfig(ctx);
      const p = projectPaths(projectId);
      const nodes: ScopeOutput['nodes'] = [];
      const edges: ScopeOutput['edges'] = [];

      // The project's site root (single site scoped to this connection).
      let pageCount = 0;
      try {
        const { total } = await aemQueryBuilderHits(
          config,
          { path: p.content, type: 'cq:Page' },
          0,
        );
        pageCount = total;
      } catch {
        pageCount = 0;
      }
      const siteRoot = await aemFetchJson(config, p.content, 1);
      const siteName =
        (siteRoot?.['jcr:content'] as Record<string, unknown> | undefined)?.[
          'jcr:title'
        ];
      nodes.push(
        node(
          'site',
          p.content,
          typeof siteName === 'string' ? siteName : p.key,
          'snapshot',
          { path: p.content, pages: pageCount },
        ),
      );

      // Pages under the project (capped).
      const { total, hits } = await aemQueryBuilderHits(
        config,
        { path: p.content, type: 'cq:Page' },
        200,
      );
      for (const h of hits) {
        nodes.push(
          node('page', h.path, hitProp(h, 'jcr:title') ?? h.name, 'snapshot', {
            path: h.path,
          }),
        );
        edges.push({ fromExternalId: p.content, toExternalId: h.path, type: 'contains' });
      }

      // Scan page content for the components each page instantiates, emitting
      // page -> component `uses` edges (component nodes are stored `/apps/<rt>`).
      const PAGE_SCAN_LIMIT = 150;
      const scanned = await mapLimit(
        hits.slice(0, PAGE_SCAN_LIMIT),
        8,
        async (h) => {
          try {
            const content = await aemFetchJson(config, `${h.path}/jcr:content`, 12);
            const rts = collectResourceTypes(content);
            return { path: h.path, rts: Array.from(rts) };
          } catch {
            return { path: h.path, rts: [] as string[] };
          }
        },
      );
      for (const { path, rts } of scanned) {
        for (const rt of rts) {
          if (isFrameworkResourceType(rt)) continue;
          edges.push({
            fromExternalId: path,
            toExternalId: `/apps/${rt}`,
            type: 'uses',
          });
        }
      }

      return { nodes, edges, totals: { site: 1, page: total } };
    },
  },
  {
    id: 'content-types',
    name: 'Discover Components, Templates & Models',
    scope: 'content-types',
    async execute(ctx, projectId): Promise<ScopeOutput> {
      const config = resolveConfig(ctx);
      const p = projectPaths(projectId);
      const nodes: ScopeOutput['nodes'] = [];
      const edges: ScopeOutput['edges'] = [];
      const totals: ScopeOutput['totals'] = {};

      // Max components to deep-enrich with fields (each = 1 extra request).
      const ENRICH_LIMIT = 400;
      const ENRICH_CONCURRENCY = 8;

      // Map resourceType -> component path, so template structure can resolve
      // which components a template uses.
      const rtToPath = new Map<string, string>();

      // Components: the project's own /apps tree + any manual extra app paths.
      const appRoots = [p.apps, ...(config.extraAppPaths ?? [])];
      const componentHits: AemHit[] = [];
      for (const root of appRoots) {
        try {
          const res = await aemQueryBuilderHits(config, {
            path: root,
            type: 'cq:Component',
          });
          componentHits.push(...res.hits);
        } catch {
          // best-effort per root
        }
      }
      // De-dupe by path.
      const seenComp = new Set<string>();
      const components = componentHits.filter((h) => {
        if (seenComp.has(h.path)) return false;
        seenComp.add(h.path);
        return true;
      });
      totals.component = components.length;

      for (const h of components) {
        rtToPath.set(h.path.replace(/^\/apps\//, ''), h.path);
      }

      // Enrich (fields + allowed children) concurrently, best-effort.
      const enriched = await mapLimit(
        components.slice(0, ENRICH_LIMIT),
        ENRICH_CONCURRENCY,
        async (h) => {
          try {
            const dialog =
              (await aemFetchJson(config, `${h.path}/cq:dialog`, 20)) ??
              (await aemFetchJson(config, h.path, 12));
            return {
              path: h.path,
              fields: extractFields(dialog),
              allowed: Array.from(collectAllowedComponents(dialog)),
            };
          } catch {
            return { path: h.path, fields: [] as FieldDef[], allowed: [] as string[] };
          }
        },
      );
      const enrichmentByPath = new Map(enriched.map((e) => [e.path, e]));

      for (const h of components) {
        const rt = h.path.replace(/^\/apps\//, '');
        const attributes: GraphNode['attributes'] = {
          resourceType: rt,
          superType: hitProp(h, 'sling:resourceSuperType'),
          group:
            (hitProp(h, 'componentGroup') as string | undefined) ?? 'General',
        };

        const enrichment = enrichmentByPath.get(h.path);
        if (enrichment) {
          if (enrichment.fields.length > 0) {
            attributes.fields = enrichment.fields;
          }
          if (enrichment.allowed.length > 0) {
            attributes.allowedChildren = enrichment.allowed.map((rtName) =>
              humanizeResourceType(rtName),
            );
            for (const child of enrichment.allowed) {
              const childPath = rtToPath.get(child) ?? `/apps/${child}`;
              edges.push({
                fromExternalId: h.path,
                toExternalId: childPath,
                type: 'contains',
              });
            }
          }
        }

        const superType = hitProp(h, 'sling:resourceSuperType');
        if (superType) {
          edges.push({
            fromExternalId: h.path,
            toExternalId: `/apps/${superType}`,
            type: 'inherits',
          });
        }

        nodes.push(
          node('component', h.path, hitProp(h, 'jcr:title') ?? h.name, 'definition', attributes),
        );
      }

      // Referenced resource types outside the project's /apps (shared libs),
      // collected while walking template structures for inference.
      const inferredSharedRts = new Set<string>();

      // Templates (definition) — enrich with the components they use.
      const templates = await aemQueryBuilderHits(config, {
        path: p.conf,
        type: 'cq:Template',
      });
      totals.template = templates.total;

      for (let i = 0; i < templates.hits.length; i++) {
        const h = templates.hits[i];
        const content =
          (h.properties['jcr:content'] as Record<string, unknown> | undefined) ??
          {};
        const attributes: GraphNode['attributes'] = {
          templateType: 'Page Template',
          description:
            typeof content['jcr:description'] === 'string'
              ? (content['jcr:description'] as string)
              : undefined,
          status:
            typeof content.status === 'string'
              ? (content.status as string)
              : undefined,
        };

        if (i < ENRICH_LIMIT) {
          try {
            // A template's composition lives under `<template>/structure`.
            const structure = await aemFetchJson(config, `${h.path}/structure`, 10);
            const usedRts = Array.from(collectResourceTypes(structure));
            if (usedRts.length > 0) {
              attributes.usesComponents = usedRts.map((rt) =>
                humanizeResourceType(rt),
              );
              for (const rt of usedRts) {
                const compPath = rtToPath.get(rt) ?? `/apps/${rt}`;
                edges.push({
                  fromExternalId: h.path,
                  toExternalId: compPath,
                  type: 'uses',
                });
                // Infer shared components referenced outside the project apps.
                if (
                  !isFrameworkResourceType(rt) &&
                  !isProjectResourceType(rt, p.key) &&
                  !rtToPath.has(rt)
                ) {
                  inferredSharedRts.add(rt);
                }
              }
            }
            // Allowed components (from policies referenced by the template).
            const allowed = Array.from(collectAllowedComponents(structure));
            if (allowed.length > 0) {
              attributes.allowedComponents = allowed.map((rt) =>
                humanizeResourceType(rt),
              );
            }
            // Regions (immediate children of structure/.../root) become the
            // template's "structure" outline.
            const regions = extractRegions(structure);
            if (regions.length > 0) {
              attributes.regions = regions;
            }
          } catch {
            // best-effort
          }
        }

        nodes.push(
          node('template', h.path, hitProp(h, 'jcr:title') ?? h.name, 'definition', attributes),
        );
      }

      // Content Fragment Models (definition).
      const models = await aemQueryBuilderHits(config, {
        path: p.conf,
        type: 'cq:Template',
        property: 'jcr:content/sling:resourceType',
        'property.value': 'dam/cfm/models/console/components/data/entity',
      });
      totals.model = models.total;
      for (const h of models.hits) {
        nodes.push(node('model', h.path, hitProp(h, 'jcr:title') ?? h.name, 'definition'));
      }

      // Inferred shared components: resource types referenced by the project's
      // templates that live outside the project /apps tree. Fetch each and add
      // as a component node so the graph is complete.
      const inferred = await mapLimit(
        Array.from(inferredSharedRts),
        ENRICH_CONCURRENCY,
        async (rt) => {
          const path = `/apps/${rt}`;
          try {
            const comp = await aemFetchJson(config, path, 2);
            if (!comp) return null;
            const dialog = await aemFetchJson(config, `${path}/cq:dialog`, 20);
            return {
              rt,
              path,
              title:
                typeof comp['jcr:title'] === 'string'
                  ? (comp['jcr:title'] as string)
                  : humanizeResourceType(rt),
              fields: extractFields(dialog),
            };
          } catch {
            return null;
          }
        },
      );
      for (const c of inferred) {
        if (!c || seenComp.has(c.path)) continue;
        seenComp.add(c.path);
        rtToPath.set(c.rt, c.path);
        const attributes: GraphNode['attributes'] = {
          resourceType: c.rt,
          group: 'Shared',
          shared: true,
        };
        if (c.fields.length > 0) attributes.fields = c.fields;
        nodes.push(node('component', c.path, c.title, 'definition', attributes));
        totals.component = (totals.component ?? 0) + 1;
      }

      return { nodes, edges, totals };
    },
  },
  {
    id: 'relationships',
    name: 'Discover Dialogs & Policies',
    scope: 'relationships',
    async execute(ctx, projectId): Promise<ScopeOutput> {
      const config = resolveConfig(ctx);
      const p = projectPaths(projectId);
      const nodes: ScopeOutput['nodes'] = [];
      const totals: ScopeOutput['totals'] = {};

      const dialogs = await aemQueryBuilderHits(config, {
        path: p.apps,
        nodename: 'cq:dialog',
      });
      totals.dialog = dialogs.total;
      for (const h of dialogs.hits) {
        nodes.push(node('dialog', h.path, h.path, 'definition'));
      }

      const policies = await aemQueryBuilderHits(config, {
        path: p.conf,
        nodename: 'policies',
      });
      totals.policy = policies.total;
      for (const h of policies.hits) {
        nodes.push(node('policy', h.path, h.path, 'definition'));
      }

      return { nodes, edges: [], totals };
    },
  },
  {
    id: 'assets',
    name: 'Discover Assets (DAM)',
    scope: 'assets',
    async execute(ctx, projectId): Promise<ScopeOutput> {
      const config = resolveConfig(ctx);
      const p = projectPaths(projectId);
      // Prefer the project's DAM folder; include any manual asset paths.
      const roots = [p.dam, ...(config.assetPaths ?? [])];
      const nodes: ScopeOutput['nodes'] = [];
      const seen = new Set<string>();
      for (const root of roots) {
        try {
          const folders = await aemListChildren(config, root, 'sling:Folder');
          for (const f of folders) {
            if (seen.has(f.path)) continue;
            seen.add(f.path);
            nodes.push(node('assetFolder', f.path, f.name, 'snapshot', { path: f.path }));
          }
        } catch {
          // folder may not exist; best-effort
        }
      }
      return { nodes, edges: [], totals: { assetFolder: nodes.length } };
    },
  },
  {
    id: 'languages',
    name: 'Discover Languages',
    scope: 'languages',
    async execute(ctx, projectId): Promise<ScopeOutput> {
      const config = resolveConfig(ctx);
      const p = projectPaths(projectId);
      const { total, hits } = await aemQueryBuilderHits(config, {
        path: p.content,
        type: 'cq:Page',
        property: 'jcr:content/jcr:language',
        'property.operation': 'exists',
      });
      const nodes = hits.map((h) =>
        node('language', h.path, hitProp(h, 'jcr:language') ?? h.name, 'snapshot', {
          code: hitProp(h, 'jcr:language'),
          path: h.path,
        }),
      );
      return { nodes, edges: [], totals: { language: total } };
    },
  },
  {
    id: 'metadata',
    name: 'Discover GraphQL Schemas',
    scope: 'metadata',
    async execute(ctx): Promise<ScopeOutput> {
      const config = resolveConfig(ctx);
      const res = await aemRequest(config, '/graphql/list.json', {
        withAuth: true,
        accept: 'application/json',
      });
      if (res.networkError || res.status === 404) {
        return { nodes: [], edges: [], totals: { graphqlSchema: 0 } };
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error('Access denied');
      }
      try {
        const parsed = JSON.parse(res.text ?? '[]');
        const arr = Array.isArray(parsed) ? parsed : [];
        const nodes = arr.map((entry, i) => {
          const rec = entry as Record<string, unknown>;
          const name =
            (rec.configurationName as string) ??
            (rec.name as string) ??
            `schema-${i}`;
          return node('graphqlSchema', name, name, 'definition');
        });
        return { nodes, edges: [], totals: { graphqlSchema: arr.length } };
      } catch {
        return { nodes: [], edges: [], totals: { graphqlSchema: 0 } };
      }
    },
  },
];

/* ----------------------------- connector ------------------------------ */

export const aemConnector: CMSConnector = {
  manifest: getManifest('aem'),

  metadata(): CMSMetadata {
    return {
      key: 'aem',
      name: 'Adobe Experience Manager',
      version: '2.0.0',
      vendor: 'Adobe',
      description: 'AEM Author connector (Cloud Service / on-prem).',
    };
  },

  features(): Feature[] {
    return [
      { id: 'discover', name: 'Discovery', supported: true },
      { id: 'export-assets', name: 'Export Assets', supported: true, readOnly: true },
      { id: 'export-content', name: 'Export Content', supported: true, readOnly: true },
      { id: 'graphql-export', name: 'GraphQL Export', supported: true, requires: ['graphql'] },
      { id: 'import', name: 'Import', supported: true },
      { id: 'publish', name: 'Publish', supported: true },
    ];
  },

  validationTasks() {
    return validationTasks;
  },

  capabilityProbes() {
    return capabilityProbes;
  },

  discoveryTasks() {
    return discoveryTasks;
  },

  async authenticate(ctx: ConnectorContext): Promise<AuthResult> {
    const config = resolveConnectionConfig(ctx);
    // Probe a lightweight authenticated endpoint to verify credentials.
    // /bin/querybuilder.json with p.limit=0 returns quickly and requires auth.
    const res = await aemRequest(config, '/bin/querybuilder.json?p.limit=0&p.hits=none', {
      withAuth: true,
      accept: 'application/json',
    });

    if (res.networkError) {
      return { ok: false, message: res.errorMessage ?? 'Network error — AEM is unreachable.' };
    }
    if (res.status === 401) {
      return { ok: false, message: 'Authentication failed — check username and password.' };
    }
    if (res.status === 403) {
      return { ok: false, message: 'Access denied — the account lacks read permission.' };
    }
    if (!res.ok && res.status !== 404) {
      // 404 is acceptable — path may not exist but auth was accepted.
      return { ok: false, message: `AEM returned HTTP ${res.status}.` };
    }
    return { ok: true };
  },

  async validateConnection(ctx: ConnectorContext): Promise<ValidationResult> {
    const tasks: ValidationResult['tasks'] = [];
    let aborted = false;
    for (const task of validationTasks) {
      if (aborted) {
        tasks.push({
          id: task.id,
          name: task.name,
          description: task.description,
          status: 'skipped',
          message: 'Skipped',
        });
        continue;
      }
      const start = Date.now();
      let result: TaskResult;
      try {
        result = await task.execute(ctx);
      } catch (error) {
        result = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Task failed',
        };
      }
      const status =
        task.optional && result.status === 'error' ? 'warning' : result.status;
      tasks.push({
        id: task.id,
        name: task.name,
        description: task.description,
        status,
        message: result.message,
        durationMs: Date.now() - start,
      });
      if (status === 'error' && !task.optional) {
        aborted = true;
      }
    }
    return { ok: tasks.every((t) => t.status !== 'error'), tasks };
  },

  async discoverProjects(ctx: ConnectorContext): Promise<Project[]> {
    const config = resolveConnectionConfig(ctx);
    const SKIP = new Set([
      'experience-fragments',
      'screens',
      'dam',
      'campaigns',
      'launches',
      'cq:tags',
      'mac',
      'projects',
      'forms',
      'communities',
    ]);

    // Primary: QueryBuilder for immediate cq:Page children of /content
    // (depth-scoped). This is the same reliable mechanism the rest of
    // discovery uses.
    const roots = new Map<string, { name: string; path: string }>();
    try {
      const { hits } = await aemQueryBuilderHits(
        config,
        {
          path: '/content',
          type: 'cq:Page',
          'path.exact': 'false',
          'p.nodedepth': '0',
        },
        100,
      );
      for (const h of hits) {
        // Only top-level site roots: /content/<name> (one segment deep).
        const rel = h.path.replace(/^\/content\//, '');
        if (!rel || rel.includes('/')) continue;
        roots.set(rel, { name: rel, path: h.path });
      }
    } catch {
      // fall through to the listing fallback
    }

    // Fallback: list children of /content.
    if (roots.size === 0) {
      try {
        const children = await aemListChildren(config, '/content', 'cq:Page');
        for (const c of children) roots.set(c.name, { name: c.name, path: c.path });
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to list /content');
      }
    }

    const entries = Array.from(roots.values()).filter((r) => !SKIP.has(r.name));

    // Fetch titles concurrently (best-effort).
    const projects = await mapLimit(entries, 6, async (site) => {
      let title: string | undefined;
      try {
        const root = await aemFetchJson(config, site.path, 1);
        const t = (root?.['jcr:content'] as Record<string, unknown> | undefined)?.[
          'jcr:title'
        ];
        title = typeof t === 'string' ? t : undefined;
      } catch {
        title = undefined;
      }
      return { id: site.name, name: title ?? site.name, description: site.path };
    });

    return projects;
  },

  async export(ctx: ConnectorContext, options: ExportOptions): Promise<NexusTree> {
    const config = resolveConnectionConfig(ctx);
    return buildNexusTree(config, options.projectId);
  },

  async provision(): Promise<ProvisionResult> {
    // AEM provisioning (editable templates / component nodes) is not yet
    // implemented — provisioning currently targets Contentful only.
    return provisionNotSupported('AEM');
  },

  async import(ctx: ConnectorContext, tree: NexusTree): Promise<ImportResult> {
    const config = resolveConnectionConfig(ctx);
    return importNexusTree(config, tree);
  },

  async publish(ctx: ConnectorContext, ids: string[]): Promise<void> {
    const config = resolveConnectionConfig(ctx);
    await replicateNodes(config, ids);
  },
};
