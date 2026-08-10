/** FirstSpirit connector (stub, v2 contract). Network calls simulated. */

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
import type { ProvisionResult } from '@/data/meta/provision/types';
import { provisionNotSupported } from '../provision-unsupported';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const validationTasks: ValidationTask[] = [
  { id: 'reachable', name: 'Server Reachable', async execute(): Promise<TaskResult> { await delay(120); return { status: 'success' }; } },
  { id: 'auth', name: 'Authentication', async execute(): Promise<TaskResult> { await delay(120); return { status: 'success' }; } },
  { id: 'project', name: 'Project Access', async execute(): Promise<TaskResult> { await delay(100); return { status: 'success' }; } },
];

const capabilityProbes: CapabilityProbe[] = [
  { key: 'assets', name: 'Media Store', async execute(): Promise<Capability> { await delay(60); return { key: 'assets', supported: true }; } },
  { key: 'translation', name: 'Languages', async execute(): Promise<Capability> { await delay(60); return { key: 'translation', supported: true }; } },
  { key: 'publishing', name: 'Publishing', async execute(): Promise<Capability> { await delay(60); return { key: 'publishing', supported: true }; } },
];

const discoveryTasks: DiscoveryTask[] = [
  { id: 'structure', name: 'Discover Page & Content Store', scope: 'structure', async execute(): Promise<ScopeOutput> { await delay(100); return { nodes: [], edges: [] }; } },
  { id: 'content-types', name: 'Discover Templates', scope: 'content-types', async execute(): Promise<ScopeOutput> { await delay(100); return { nodes: [], edges: [] }; } },
  { id: 'relationships', name: 'Discover Input Components', scope: 'relationships', async execute(): Promise<ScopeOutput> { await delay(100); return { nodes: [], edges: [] }; } },
  { id: 'assets', name: 'Discover Media Store', scope: 'assets', async execute(): Promise<ScopeOutput> { await delay(100); return { nodes: [], edges: [] }; } },
  { id: 'languages', name: 'Discover Languages', scope: 'languages', async execute(): Promise<ScopeOutput> { await delay(100); return { nodes: [], edges: [] }; } },
];

export const firstSpiritConnector: CMSConnector = {
  manifest: getManifest('firstspirit'),
  metadata(): CMSMetadata {
    return { key: 'firstspirit', name: 'FirstSpirit', version: '2.0.0', description: 'FirstSpirit server connector.' };
  },
  features(): Feature[] {
    return [
      { id: 'discover', name: 'Discovery', supported: false },
      { id: 'publish', name: 'Publish', supported: false },
    ];
  },
  validationTasks() { return validationTasks; },
  capabilityProbes() { return capabilityProbes; },
  discoveryTasks() { return discoveryTasks; },
  async authenticate(): Promise<AuthResult> { await delay(50); return { ok: true }; },
  async validateConnection(ctx: ConnectorContext): Promise<ValidationResult> {
    const tasks: ValidationResult['tasks'] = [];
    for (const task of validationTasks) {
      const start = Date.now();
      const result = await task.execute(ctx);
      tasks.push({ id: task.id, name: task.name, status: result.status, message: result.message, durationMs: Date.now() - start });
    }
    return { ok: tasks.every((t) => t.status !== 'error'), tasks };
  },
  async discoverProjects(): Promise<Project[]> {
    await delay(50);
    return [
      { id: 'corporate', name: 'Corporate Website' },
      { id: 'catalog', name: 'Product Catalog' },
    ];
  },
  async export(ctx: ConnectorContext, options: ExportOptions): Promise<NexusTree> {
    await delay(100);
    return { connection: ctx.connectionId, blueprint: options.projectId, root: { id: 'root', type: 'root', name: 'root', fields: {}, children: [] } };
  },
  async provision(): Promise<ProvisionResult> { return provisionNotSupported('FirstSpirit'); },
  async import(): Promise<ImportResult> { await delay(100); return { ok: true, created: 0, updated: 0, failed: 0 }; },
  async publish(): Promise<void> { await delay(50); },
};
