/**
 * ContentfulDiscoveryService — orchestrates the discovery flow:
 *
 *   validate token → spaces → environments → locales → content types
 *   → editor interfaces (optional) → assets metadata (optional) → Blueprint
 *
 * Does NOT download assets and does NOT retrieve entries (that is Migration).
 * Produces graph nodes/edges via the ContentfulMapper.
 */

import type { ScopeOutput } from '../../types';
import type { ContentfulConfig } from '../../config';
import {
  getSpace,
  listContentTypes,
  listLocales,
  listAssets,
  type ContentfulContentType,
  type ContentfulLocale,
} from './client';
import {
  assetToNode,
  contentTypeToNode,
  localeToNode,
  usesAssets,
  ids,
} from './mapper';

export class ContentfulDiscoveryService {
  constructor(private readonly config: ContentfulConfig) {}

  /** content-types scope: Content Types → `model` nodes + reference edges. */
  async discoverContentTypes(): Promise<ScopeOutput> {
    const contentTypes = await listContentTypes(this.config);
    const nodes: ScopeOutput['nodes'] = [];
    const edges: ScopeOutput['edges'] = [];

    // A synthetic asset-scope node so asset links have a stable target even
    // before the assets scope runs (kept lightweight).
    let anyAssetUsage = false;

    for (const ct of contentTypes) {
      const { node, edges: ctEdges } = contentTypeToNode(ct);
      nodes.push(node);
      edges.push(...ctEdges);
      if (usesAssets(ct)) anyAssetUsage = true;
    }

    // Emit `uses` edges from content types to the assets folder when they link
    // assets (Relationship signal without downloading anything).
    if (anyAssetUsage) {
      nodes.push({
        kind: 'assetFolder',
        externalId: 'assetFolder:root',
        name: 'Assets',
        layer: 'snapshot',
        attributes: { 'contentful.scope': 'assets' },
      });
      for (const ct of contentTypes) {
        if (usesAssets(ct)) {
          edges.push({
            fromExternalId: ids.contentType(ct.sys.id),
            toExternalId: 'assetFolder:root',
            type: 'uses',
          });
        }
      }
    }

    return { nodes, edges, totals: { model: contentTypes.length } };
  }

  /** languages scope: Locales → `language` nodes. */
  async discoverLocales(): Promise<ScopeOutput> {
    const locales = await listLocales(this.config);
    const nodes = locales.map((l: ContentfulLocale) => localeToNode(l));
    return { nodes, edges: [], totals: { language: locales.length } };
  }

  /** assets scope: Asset METADATA only (no downloads, capped). */
  async discoverAssets(): Promise<ScopeOutput> {
    const [{ items, total }, locales] = await Promise.all([
      listAssets(this.config, 100),
      listLocales(this.config).catch(() => [] as ContentfulLocale[]),
    ]);
    const defaultLocale =
      locales.find((l) => l.default)?.code ?? locales[0]?.code ?? 'en-US';
    const nodes = items.map((a) => assetToNode(a, defaultLocale));
    return { nodes, edges: [], totals: { asset: total } };
  }

  /** metadata scope: Space + configured environment facts (delivery API). */
  async discoverMetadata(): Promise<ScopeOutput> {
    const space = await getSpace(this.config);
    const nodes: ScopeOutput['nodes'] = [
      {
        kind: 'site',
        externalId: `space:${space.sys.id}`,
        name: space.name,
        layer: 'snapshot',
        attributes: {
          'contentful.spaceId': space.sys.id,
          'contentful.environment': this.config.environment ?? 'master',
        },
      },
    ];
    return { nodes, edges: [], totals: { site: 1 } };
  }
}

/** Return content types keyed by id (helper reused by provision planning). */
export function indexContentTypes(
  cts: ContentfulContentType[],
): Map<string, ContentfulContentType> {
  return new Map(cts.map((c) => [c.sys.id, c]));
}
