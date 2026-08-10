/**
 * The CMS Connector contract (v2).
 *
 * Nexus Core ONLY interacts with this interface + the connector Manifest.
 * Every CMS-specific behaviour (auth, validation, capability detection,
 * discovery producing graph nodes/edges, export/import) lives inside a concrete
 * connector under `connectors/<key>`.
 *
 * See AGENTS.md — Nexus Core must never contain CMS-specific logic.
 */

import type {
  AuthResult,
  Capability,
  CMSMetadata,
  DiscoveryScope,
  ExportOptions,
  Feature,
  ImportResult,
  NexusTree,
  Project,
  ScopeOutput,
  TaskResult,
  ValidationResult,
} from './types';
import type { ConnectorManifest } from './manifest';
import type {
  ProvisionPlan,
  ProvisionResult,
} from '@/data/meta/provision/types';

/**
 * A single validation task. The Validation Engine runs each in order; it does
 * not know what any task does. Non-optional failures short-circuit the run.
 */
export interface ValidationTask {
  id: string;
  name: string;
  description?: string;
  optional?: boolean;
  execute(ctx: ConnectorContext): Promise<TaskResult>;
}

/**
 * A capability probe. Capability Discovery runs each and records what the
 * connection supports, reusable forever by later engines.
 */
export interface CapabilityProbe {
  key: Capability['key'];
  name: string;
  execute(ctx: ConnectorContext): Promise<Capability>;
}

/**
 * A discovery task bound to a GENERIC scope (see AGENTS.md §4). The connector
 * translates the scope into CMS-specific queries and returns graph output.
 */
export interface DiscoveryTask {
  id: string;
  name: string;
  description?: string;
  scope: DiscoveryScope;
  execute(ctx: ConnectorContext, projectId: string): Promise<ScopeOutput>;
}

/** Runtime context handed to tasks: decrypted config + auth material. */
export interface ConnectorContext {
  connectionId: string;
  config: Record<string, unknown>;
  auth?: AuthResult;
}

export interface CMSConnector {
  /** Static manifest (identity, auth methods, coarse support map). */
  readonly manifest: ConnectorManifest;

  metadata(): CMSMetadata;

  /** Rich features this connector can perform (replaces capabilities()). */
  features(): Feature[];

  validationTasks(): ValidationTask[];

  /** Probes run by Capability Discovery. */
  capabilityProbes(): CapabilityProbe[];

  /** Discovery tasks, each tagged with a generic scope. */
  discoveryTasks(): DiscoveryTask[];

  authenticate(ctx: ConnectorContext): Promise<AuthResult>;

  validateConnection(ctx: ConnectorContext): Promise<ValidationResult>;

  discoverProjects(ctx: ConnectorContext): Promise<Project[]>;

  /**
   * Materialize a CMS-independent {@link ProvisionPlan} into the target CMS
   * (create content types / fields / validations / references and optionally
   * publish). Connectors that cannot provision return a `not supported` result
   * rather than throwing. Provisioning covers STRUCTURE only — never entries or
   * assets (that is Migration, out of scope).
   */
  provision(
    ctx: ConnectorContext,
    plan: ProvisionPlan,
  ): Promise<ProvisionResult>;

  export(ctx: ConnectorContext, options: ExportOptions): Promise<NexusTree>;

  import(ctx: ConnectorContext, tree: NexusTree): Promise<ImportResult>;

  publish(ctx: ConnectorContext, ids: string[]): Promise<void>;
}
