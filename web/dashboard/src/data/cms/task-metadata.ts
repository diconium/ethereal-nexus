/**
 * Client-safe metadata for the Add CMS wizard: validation task labels,
 * capability probe labels, and generic discovery-scope labels. Lets the wizard
 * render progress without importing server-only connector code.
 *
 * Keep in sync with the connector implementations under `connectors/`.
 */

import type { CmsConnectorKey } from './config';
import type { CapabilityKey, DiscoveryScope } from './types';

export type TaskMeta = {
  id?: string;
  name: string;
  description?: string;
};

/* ----------------------------- validation ----------------------------- */

export const CMS_VALIDATION_TASKS: Partial<
  Record<CmsConnectorKey, TaskMeta[]>
> = {
  aem: [
    { name: 'Server Reachable', description: 'Request the Author URL.' },
    { name: 'Authentication', description: 'Sign in with your credentials.' },
    { name: 'AEM Detection', description: 'Detect Adobe Experience Manager.' },
    { name: 'Read Permissions', description: 'Check read access to core trees.' },
  ],
  strapi: [
    { id: 'reachable',      name: 'Server Reachable',       description: 'Check the Strapi server URL is reachable.' },
    { id: 'auth',           name: 'Authentication',         description: 'Validate the API token.' },
    { id: 'version',        name: 'Version Detection',      description: 'Detect the Strapi server version.' },
    { id: 'admin-api',      name: 'Admin API Available',    description: 'Verify access to the Content-Type Builder.' },
    { id: 'content-types',  name: 'Content Types Retrieved', description: 'Retrieve collection and single types.' },
    { id: 'components',     name: 'Components Retrieved',   description: 'Retrieve shared components.' },
    { id: 'upload-plugin',  name: 'Upload Plugin',          description: 'Check media library availability (optional).' },
  ],
  firstspirit: [
    { name: 'Server Reachable', description: 'Request the FirstSpirit server.' },
    { name: 'Authentication', description: 'Sign in with your credentials.' },
    { name: 'Project Access', description: 'Verify access to the project.' },
  ],
  contentful: [
    { name: 'API Reachable', description: 'Reach the Delivery API.' },
    { name: 'Token Valid', description: 'Validate the Delivery API token.' },
    { name: 'Space Retrieved', description: 'Retrieve the configured space.' },
    { name: 'Environment Exists', description: 'Verify the environment exists.' },
    { name: 'Locales Retrieved', description: 'Retrieve the space locales.' },
    { name: 'Content Types Accessible', description: 'Retrieve the content types.' },
  ],
};

export function getValidationTasks(key: CmsConnectorKey): TaskMeta[] {
  return CMS_VALIDATION_TASKS[key] ?? [];
}

export function getValidationTaskLabels(key: CmsConnectorKey): string[] {
  return getValidationTasks(key).map((t) => t.name);
}

/* ---------------------------- capabilities ----------------------------- */

export const CMS_CAPABILITY_PROBES: Partial<
  Record<CmsConnectorKey, { key: CapabilityKey; name: string }[]>
> = {
  aem: [
    { key: 'cloud', name: 'Cloud vs On-Premise' },
    { key: 'assets', name: 'Assets API' },
    { key: 'content-fragments', name: 'Content Fragments' },
    { key: 'graphql', name: 'GraphQL' },
    { key: 'editable-templates', name: 'Editable Templates' },
    { key: 'publishing', name: 'Publishing' },
  ],
  strapi: [
    { key: 'rest',        name: 'REST API' },
    { key: 'assets',      name: 'Media Library' },
    { key: 'translation', name: 'Internationalization (i18n)' },
    { key: 'publishing',  name: 'Draft & Publish' },
  ],
  firstspirit: [
    { key: 'assets', name: 'Media Store' },
    { key: 'translation', name: 'Languages' },
    { key: 'publishing', name: 'Publishing' },
  ],
  contentful: [
    { key: 'rest', name: 'REST API' },
    { key: 'assets', name: 'Assets' },
    { key: 'translation', name: 'Localization' },
    { key: 'publishing', name: 'Publishing' },
  ],
};

export function getCapabilityProbeLabels(key: CmsConnectorKey) {
  return CMS_CAPABILITY_PROBES[key] ?? [];
}

/* --------------------------- discovery scopes -------------------------- */

export type ScopeMeta = {
  scope: DiscoveryScope;
  label: string;
  description: string;
  defaultChecked: boolean;
};

export const DISCOVERY_SCOPE_META: ScopeMeta[] = [
  { scope: 'structure', label: 'Structure', description: 'Sites, pages and hierarchy.', defaultChecked: true },
  { scope: 'content-types', label: 'Content Types', description: 'Components, templates and models.', defaultChecked: true },
  { scope: 'relationships', label: 'Relationships', description: 'Dialogs, policies and links.', defaultChecked: true },
  { scope: 'assets', label: 'Assets', description: 'Media and asset folders.', defaultChecked: true },
  { scope: 'languages', label: 'Languages', description: 'Locales and translations.', defaultChecked: true },
  { scope: 'metadata', label: 'Metadata', description: 'Schemas and technical metadata.', defaultChecked: false },
  { scope: 'permissions', label: 'Permissions', description: 'Access control (read-only).', defaultChecked: false },
];
