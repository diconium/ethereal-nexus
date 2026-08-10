/**
 * Contentful connector (v2 contract).
 *
 * - Validation: token valid, space reachable, environment exists, locales +
 *   content types accessible. Real HTTP against the Management API.
 * - Capability Discovery: REST, assets, translation (locales), publishing.
 * - Discovery: generic scopes → Contentful queries → graph Nodes + Edges.
 *   Flow: validate token → spaces → environments → locales → content types
 *   → editor interfaces (optional) → assets metadata (optional) → Blueprint.
 * - Provision: materializes a ProvisionPlan into Contentful content types.
 *
 * The connector receives ONLY a Connection, a Blueprint (via discovery) and a
 * ProvisionPlan — it knows nothing about AEM or the Mapping.
 */

import type {
  AuthResult,
  Capability,
  CMSMetadata,
  ExportOptions,
  Feature,
  ImportResult,
  NexusTree,
  Project,
  ScopeOutput,
  TaskResult,
  ValidationResult,
} from '../../types';
import type {
  CapabilityProbe,
  CMSConnector,
  ConnectorContext,
  DiscoveryTask,
  ValidationTask,
} from '../../connector';
import { getManifest } from '../../manifest';
import { contentfulConfigSchema, type ContentfulConfig } from '../../config';
import {
  getSpace,
  listContentTypes,
  listLocales,
  environmentExists,
  contentfulRequest,
  ContentfulError,
} from './client';
import { ContentfulDiscoveryService } from './discovery';
import { ContentfulProvisionService } from './provision';
import type {
  ProvisionPlan,
  ProvisionResult,
} from '@/data/meta/provision/types';

function resolveConfig(ctx: ConnectorContext): ContentfulConfig {
  return contentfulConfigSchema.parse(ctx.config);
}

/** Turn any thrown error into a TaskResult. */
function taskError(error: unknown): TaskResult {
  if (error instanceof ContentfulError) {
    return { status: 'error', message: error.message };
  }
  return {
    status: 'error',
    message: error instanceof Error ? error.message : 'Task failed',
  };
}

/* ----------------------------- validation ----------------------------- */

const validationTasks: ValidationTask[] = [
  {
    id: 'reachable',
    name: 'API Reachable',
    description: 'Reach the Contentful Delivery API.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      // Hit the space root on the delivery host (validates host + token).
      const res = await contentfulRequest(config, `/spaces/${config.spaceId}`, {
        api: 'delivery',
      });
      if (res.networkError) {
        return { status: 'error', message: res.errorMessage ?? 'API unreachable' };
      }
      // 401/403 still means the host is reachable; auth task reports those.
      return { status: 'success', message: `HTTP ${res.status}` };
    },
  },
  {
    id: 'auth',
    name: 'Token Valid',
    description: 'Validate the Content Delivery API token.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      const res = await contentfulRequest(config, `/spaces/${config.spaceId}`, {
        api: 'delivery',
      });
      if (res.networkError) {
        return { status: 'error', message: res.errorMessage ?? 'Request failed' };
      }
      if (res.status === 401) {
        return {
          status: 'error',
          message:
            'Delivery token invalid or expired. Use a "Content Delivery API — access token" from Settings → API keys (not a Management token).',
        };
      }
      if (res.status === 403) {
        return { status: 'error', message: 'Token lacks permission for this space.' };
      }
      return { status: 'success', message: 'Delivery token accepted' };
    },
  },
  {
    id: 'space',
    name: 'Space Retrieved',
    description: 'Retrieve the configured space.',
    async execute(ctx): Promise<TaskResult> {
      try {
        const space = await getSpace(resolveConfig(ctx));
        return { status: 'success', message: `Space “${space.name}”` };
      } catch (error) {
        return taskError(error);
      }
    },
  },
  {
    id: 'environment',
    name: 'Environment Exists',
    description: 'Verify the configured environment exists.',
    async execute(ctx): Promise<TaskResult> {
      const config = resolveConfig(ctx);
      try {
        const target = config.environment ?? 'master';
        const exists = await environmentExists(config);
        return exists
          ? { status: 'success', message: `Environment “${target}”` }
          : { status: 'error', message: `Environment “${target}” not found.` };
      } catch (error) {
        return taskError(error);
      }
    },
  },
  {
    id: 'locales',
    name: 'Locales Retrieved',
    description: 'Retrieve the space locales.',
    async execute(ctx): Promise<TaskResult> {
      try {
        const locales = await listLocales(resolveConfig(ctx));
        return {
          status: 'success',
          message: `${locales.length} locale(s)`,
        };
      } catch (error) {
        return taskError(error);
      }
    },
  },
  {
    id: 'content-types',
    name: 'Content Types Accessible',
    description: 'Retrieve the content types.',
    async execute(ctx): Promise<TaskResult> {
      try {
        const cts = await listContentTypes(resolveConfig(ctx));
        return {
          status: 'success',
          message: `${cts.length} content type(s)`,
        };
      } catch (error) {
        return taskError(error);
      }
    },
  },
];

/* -------------------------- capability probes -------------------------- */

const capabilityProbes: CapabilityProbe[] = [
  {
    key: 'rest',
    name: 'REST API',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await contentfulRequest(config, `/spaces/${config.spaceId}`, {
        api: 'delivery',
      });
      return {
        key: 'rest',
        supported: !res.networkError && res.ok,
        detail: 'Contentful Delivery API',
      };
    },
  },
  {
    key: 'assets',
    name: 'Assets',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      const res = await contentfulRequest(
        config,
        `/spaces/${config.spaceId}/environments/${config.environment ?? 'master'}/assets?limit=1`,
        { api: 'delivery' },
      );
      return { key: 'assets', supported: !res.networkError && res.ok };
    },
  },
  {
    key: 'translation',
    name: 'Localization',
    async execute(ctx): Promise<Capability> {
      const config = resolveConfig(ctx);
      try {
        const locales = await listLocales(config);
        return {
          key: 'translation',
          supported: locales.length > 1,
          detail: `${locales.length} locale(s)`,
        };
      } catch {
        return { key: 'translation', supported: false };
      }
    },
  },
  {
    key: 'publishing',
    name: 'Publishing',
    async execute(ctx): Promise<Capability> {
      // Provisioning/publishing needs a Management token; report supported only
      // when one is configured.
      const config = resolveConfig(ctx);
      const hasCma = !!config.managementToken?.trim();
      return {
        key: 'publishing',
        supported: hasCma,
        detail: hasCma
          ? 'Management token present'
          : 'Add a Management token to enable provisioning',
      };
    },
  },
];

/* --------------------------- discovery tasks --------------------------- */

const discoveryTasks: DiscoveryTask[] = [
  {
    id: 'content-types',
    name: 'Discover Content Types',
    scope: 'content-types',
    async execute(ctx): Promise<ScopeOutput> {
      const service = new ContentfulDiscoveryService(resolveConfig(ctx));
      return service.discoverContentTypes();
    },
  },
  {
    id: 'relationships',
    name: 'Discover Relationships',
    scope: 'relationships',
    async execute(ctx): Promise<ScopeOutput> {
      // Reference edges are emitted alongside content types; this scope adds no
      // extra nodes but keeps the generic-scope contract satisfied.
      const service = new ContentfulDiscoveryService(resolveConfig(ctx));
      const out = await service.discoverContentTypes();
      return { nodes: [], edges: out.edges };
    },
  },
  {
    id: 'assets',
    name: 'Discover Assets Metadata',
    scope: 'assets',
    async execute(ctx): Promise<ScopeOutput> {
      const service = new ContentfulDiscoveryService(resolveConfig(ctx));
      return service.discoverAssets();
    },
  },
  {
    id: 'languages',
    name: 'Discover Locales',
    scope: 'languages',
    async execute(ctx): Promise<ScopeOutput> {
      const service = new ContentfulDiscoveryService(resolveConfig(ctx));
      return service.discoverLocales();
    },
  },
  {
    id: 'metadata',
    name: 'Discover Space Metadata',
    scope: 'metadata',
    async execute(ctx): Promise<ScopeOutput> {
      const service = new ContentfulDiscoveryService(resolveConfig(ctx));
      return service.discoverMetadata();
    },
  },
];

/* ------------------------------ connector ------------------------------ */

export const contentfulConnector: CMSConnector = {
  manifest: getManifest('contentful'),

  metadata(): CMSMetadata {
    return {
      key: 'contentful',
      name: 'Contentful',
      version: '1.0.0',
      vendor: 'Contentful',
      description: 'Contentful connector (discovery + structure provisioning).',
    };
  },

  features(): Feature[] {
    return [
      { id: 'discover', name: 'Discovery', supported: true },
      { id: 'provision', name: 'Provision Structure', supported: true },
      { id: 'provision-entries', name: 'Entry Migration', supported: false },
      { id: 'asset-upload', name: 'Asset Upload', supported: false },
      { id: 'experiences', name: 'Contentful Experiences', supported: false },
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
    const config = resolveConfig(ctx);
    const res = await contentfulRequest(config, `/spaces/${config.spaceId}`, {
      api: 'delivery',
    });
    if (res.networkError) {
      return { ok: false, message: res.errorMessage ?? 'Unreachable' };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Delivery token invalid or lacks permission.' };
    }
    return { ok: res.ok, token: config.deliveryToken };
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
        result = taskError(error);
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
    const config = resolveConfig(ctx);
    // One connection = one space + environment. The delivery API cannot list
    // environments, so we surface the single configured environment as the
    // project scope.
    const env = config.environment ?? 'master';
    try {
      const space = await getSpace(config);
      return [
        {
          id: env,
          name: `${space.name} — ${env}`,
          description: `Contentful space ${config.spaceId}`,
        },
      ];
    } catch (error) {
      if (error instanceof ContentfulError) throw error;
      throw error instanceof Error ? error : new Error('Discover projects failed');
    }
  },

  async provision(
    ctx: ConnectorContext,
    plan: ProvisionPlan,
  ): Promise<ProvisionResult> {
    const config = resolveConfig(ctx);
    const service = new ContentfulProvisionService(config);
    return service.run(plan);
  },

  async export(ctx: ConnectorContext, options: ExportOptions): Promise<NexusTree> {
    return {
      connection: ctx.connectionId,
      blueprint: options.projectId,
      root: { id: 'root', type: 'root', name: 'root', fields: {}, children: [] },
    };
  },

  async import(): Promise<ImportResult> {
    return { ok: true, created: 0, updated: 0, failed: 0 };
  },

  async publish(): Promise<void> {
    // Entry publishing is part of Migration (out of scope). Content-type
    // publishing happens inside provision().
  },
};
