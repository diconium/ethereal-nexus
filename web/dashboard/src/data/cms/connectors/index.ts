/**
 * Connector registry.
 *
 * Maps a connector type key to its concrete implementation. This is the single
 * place Nexus Core resolves a connector — adding a new CMS only requires
 * implementing the CMSConnector interface and registering it here.
 */

import type { CMSConnector } from '../connector';
import type { CmsConnectorKey } from '../config';
import { aemConnector } from './aem';
import { strapiConnector } from './strapi';
import { firstSpiritConnector } from './firstspirit';
import { contentfulConnector } from './contentful';

const registry: Partial<Record<CmsConnectorKey, CMSConnector>> = {
  aem: aemConnector,
  strapi: strapiConnector,
  firstspirit: firstSpiritConnector,
  contentful: contentfulConnector,
};

export function getConnector(key: CmsConnectorKey): CMSConnector | undefined {
  return registry[key];
}

export function getConnectorOrThrow(key: CmsConnectorKey): CMSConnector {
  const connector = registry[key];
  if (!connector) {
    throw new Error(`No CMS connector registered for type "${key}".`);
  }
  return connector;
}

export function listRegisteredConnectorKeys(): CmsConnectorKey[] {
  return Object.keys(registry) as CmsConnectorKey[];
}
