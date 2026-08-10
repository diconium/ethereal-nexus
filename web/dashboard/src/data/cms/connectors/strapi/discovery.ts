/**
 * StrapiDiscoveryService — orchestrates the discovery flow for Strapi v5:
 *
 *   content-types → Collection Types + Single Types + their fields/relations
 *   relationships → Shared Components + Dynamic Zones
 *   languages     → Locales (i18n plugin)
 *   assets        → Media Library presence (architecture only, no asset enum)
 *
 * Does NOT retrieve entries. Does NOT download assets.
 * Produces graph nodes and edges via the StrapiMapper.
 */

import type { ScopeOutput } from '../../types';
import type { StrapiConfig } from '../../config';
import {
  listContentTypes,
  listComponents,
  listLocales,
  checkUploadPlugin,
  type StrapiContentType,
} from './client';
import {
  contentTypeToNodes,
  componentToNodes,
  localeToNode,
  ids,
} from './mapper';

export class StrapiDiscoveryService {
  constructor(private readonly config: StrapiConfig) {}

  /**
   * content-types scope: Collection Types + Single Types → model/template nodes
   * + field/reference/asset nodes + contains/references/uses edges.
   */
  async discoverContentTypes(): Promise<ScopeOutput> {
    const contentTypes = await listContentTypes(this.config);
    const nodes: ScopeOutput['nodes'] = [];
    const edges: ScopeOutput['edges'] = [];

    let usesMedia = false;
    const collectionCount = contentTypes.filter((ct) => ct.kind === 'collectionType').length;
    const singleCount = contentTypes.filter((ct) => ct.kind === 'singleType').length;

    for (const ct of contentTypes) {
      const { nodes: ctNodes, edges: ctEdges } = contentTypeToNodes(ct);
      nodes.push(...ctNodes);
      edges.push(...ctEdges);
      if (hasMediaAttribute(ct)) usesMedia = true;
    }

    // Emit the asset folder node once if any content type references media
    if (usesMedia) {
      nodes.push({
        kind: 'assetFolder',
        externalId: ids.assetFolder(),
        name: 'Media Library',
        layer: 'snapshot',
        attributes: { 'strapi.type': 'uploadPlugin' },
      });
    }

    return {
      nodes,
      edges,
      totals: {
        model: collectionCount,
        template: singleCount,
      },
    };
  }

  /**
   * relationships scope: Shared Components + Dynamic Zone structures.
   * Also emits `uses` edges from content types to their components.
   */
  async discoverComponents(): Promise<ScopeOutput> {
    const components = await listComponents(this.config);
    const nodes: ScopeOutput['nodes'] = [];
    const edges: ScopeOutput['edges'] = [];

    for (const comp of components) {
      const { nodes: compNodes, edges: compEdges } = componentToNodes(comp);
      nodes.push(...compNodes);
      edges.push(...compEdges);
    }

    return {
      nodes,
      edges,
      totals: { component: components.length },
    };
  }

  /**
   * languages scope: Locales via i18n plugin.
   * Returns empty output (not an error) when the plugin is not installed.
   */
  async discoverLocales(): Promise<ScopeOutput> {
    const locales = await listLocales(this.config);
    const nodes = locales.map(localeToNode);
    return { nodes, edges: [], totals: { language: locales.length } };
  }

  /**
   * assets scope: Media Library architecture (presence only, no enumeration).
   * Emits a single assetFolder node when the Upload plugin is installed.
   */
  async discoverAssets(): Promise<ScopeOutput> {
    const hasUpload = await checkUploadPlugin(this.config);
    if (!hasUpload) return { nodes: [], edges: [] };

    return {
      nodes: [
        {
          kind: 'assetFolder',
          externalId: ids.assetFolder(),
          name: 'Media Library',
          layer: 'snapshot',
          attributes: {
            'strapi.type': 'uploadPlugin',
            'strapi.scope': 'assets',
          },
        },
      ],
      edges: [],
      totals: { assetFolder: 1 },
    };
  }
}

/** True if a content type has at least one media attribute. */
function hasMediaAttribute(ct: StrapiContentType): boolean {
  return Object.values(ct.attributes).some((a) => a.type === 'media');
}
