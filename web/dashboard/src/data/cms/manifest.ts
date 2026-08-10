/**
 * Connector Manifests.
 *
 * Every connector ships a manifest so the UI is fully dynamic (no CMS switch
 * statements). The manifest declares identity, supported auth methods,
 * minimum version, documentation, and a coarse `supports` map used to render
 * option cards and gate features before a connection exists.
 *
 * This module is client-safe (no server-only imports).
 */

import type { CmsConnectorKey } from './config';

export type AuthMethod = 'basic' | 'oauth' | 'token' | 'apiKey';

export interface ConnectorManifest {
  id: CmsConnectorKey;
  name: string;
  vendor?: string;
  /** Logo key resolved by the UI (see components/.../cms-logos). */
  logo: CmsConnectorKey;
  description: string;
  authentication: AuthMethod[];
  minimumVersion?: string;
  documentation?: string;
  /** Whether an implementation is available/enabled for selection. */
  available: boolean;
  /** Coarse capability hints (refined at runtime by Capability Discovery). */
  supports: {
    pages?: boolean;
    components?: boolean;
    templates?: boolean;
    contentModels?: boolean;
    assets?: boolean;
    languages?: boolean;
    graphql?: boolean;
    rest?: boolean;
    publishing?: boolean;
    workflow?: boolean;
  };
}

export const CONNECTOR_MANIFESTS: Record<CmsConnectorKey, ConnectorManifest> = {
  aem: {
    id: 'aem',
    name: 'Adobe Experience Manager',
    vendor: 'Adobe',
    logo: 'aem',
    description: 'Connect to AEM Author (Cloud Service or on-prem).',
    authentication: ['basic', 'oauth'],
    minimumVersion: '6.5',
    documentation: 'https://experienceleague.adobe.com/docs/experience-manager.html',
    available: true,
    supports: {
      pages: true,
      components: true,
      templates: true,
      contentModels: true,
      assets: true,
      languages: true,
      graphql: true,
      publishing: true,
      workflow: true,
    },
  },
  strapi: {
    id: 'strapi',
    name: 'Strapi',
    logo: 'strapi',
    description: 'Connect to a Strapi v5 headless CMS via REST and Admin API.',
    authentication: ['token'],
    minimumVersion: '5.0',
    documentation: 'https://docs.strapi.io',
    available: true,
    supports: {
      components: true,
      contentModels: true,
      assets: true,
      languages: true,
      rest: true,
      publishing: true,
    },
  },
  firstspirit: {
    id: 'firstspirit',
    name: 'FirstSpirit',
    logo: 'firstspirit',
    description: 'Connect to a FirstSpirit server and project.',
    authentication: ['basic'],
    documentation: 'https://docs.e-spirit.com',
    available: false,
    supports: {
      pages: true,
      templates: true,
      assets: true,
      languages: true,
    },
  },
  contentful: {
    id: 'contentful',
    name: 'Contentful',
    vendor: 'Contentful',
    logo: 'contentful',
    description: 'Connect to a Contentful space and environment.',
    authentication: ['token'],
    documentation: 'https://www.contentful.com/developers/docs/',
    available: true,
    supports: {
      components: true,
      contentModels: true,
      assets: true,
      languages: true,
      rest: true,
    },
  },
  datocms: {
    id: 'datocms',
    name: 'DatoCMS',
    logo: 'datocms',
    description: 'Connect to a DatoCMS project.',
    authentication: ['token'],
    documentation: 'https://www.datocms.com/docs',
    available: false,
    supports: {
      contentModels: true,
      assets: true,
      languages: true,
      graphql: true,
    },
  },
};

export function getManifest(key: CmsConnectorKey): ConnectorManifest {
  return CONNECTOR_MANIFESTS[key];
}

export function listManifests(): ConnectorManifest[] {
  return Object.values(CONNECTOR_MANIFESTS);
}
