/**
 * Graph helpers: node/edge labels + Blueprint diff (client-safe).
 *
 * The diff between two snapshots' nodes/edges is a first-class feature — see
 * AGENTS.md §5/§9.
 */

import type {
  BlueprintChange,
  EdgeType,
  GraphEdge,
  GraphNode,
  NodeKind,
} from './types';

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  site: 'Site',
  page: 'Page',
  component: 'Component',
  field: 'Field',
  asset: 'Asset',
  assetFolder: 'Asset Folder',
  model: 'Content Model',
  template: 'Template',
  editableTemplate: 'Editable Template',
  policy: 'Policy',
  dialog: 'Dialog',
  language: 'Language',
  reference: 'Reference',
  resourceType: 'Resource Type',
  graphqlSchema: 'GraphQL Schema',
};

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  contains: 'contains',
  references: 'references',
  inherits: 'inherits',
  uses: 'uses',
  extends: 'extends',
  belongsTo: 'belongs to',
  localizedAs: 'localized as',
  generatedFrom: 'generated from',
};

type NodeLike = Pick<GraphNode, 'externalId' | 'kind' | 'name'>;
type EdgeLike = Pick<GraphEdge, 'fromExternalId' | 'toExternalId' | 'type'>;

/** Compute the change set between a previous and next graph. */
export function diffGraph(
  prev: { nodes: NodeLike[]; edges: EdgeLike[] },
  next: { nodes: NodeLike[]; edges: EdgeLike[] },
): BlueprintChange[] {
  const changes: BlueprintChange[] = [];

  const prevNodes = new Map(prev.nodes.map((n) => [nodeKey(n), n]));
  const nextNodes = new Map(next.nodes.map((n) => [nodeKey(n), n]));

  for (const [key, node] of nextNodes) {
    if (!prevNodes.has(key)) {
      changes.push({
        kind: 'added',
        target: 'node',
        nodeKind: node.kind,
        externalId: node.externalId,
        name: node.name,
      });
    }
  }
  for (const [key, node] of prevNodes) {
    if (!nextNodes.has(key)) {
      changes.push({
        kind: 'removed',
        target: 'node',
        nodeKind: node.kind,
        externalId: node.externalId,
        name: node.name,
      });
    }
  }

  const prevEdges = new Set(prev.edges.map(edgeKey));
  const nextEdges = new Set(next.edges.map(edgeKey));
  for (const edge of next.edges) {
    if (!prevEdges.has(edgeKey(edge))) {
      changes.push({
        kind: 'added',
        target: 'edge',
        edgeType: edge.type,
        externalId: `${edge.fromExternalId}->${edge.toExternalId}`,
      });
    }
  }
  for (const edge of prev.edges) {
    if (!nextEdges.has(edgeKey(edge))) {
      changes.push({
        kind: 'removed',
        target: 'edge',
        edgeType: edge.type,
        externalId: `${edge.fromExternalId}->${edge.toExternalId}`,
      });
    }
  }

  return changes;
}

function nodeKey(n: NodeLike): string {
  return `${n.kind}::${n.externalId}`;
}

function edgeKey(e: EdgeLike): string {
  return `${e.type}::${e.fromExternalId}::${e.toExternalId}`;
}

/** Summarize a change set (e.g. "+2 Components, -1 Template, +5 Fields"). */
export function summarizeChanges(changes: BlueprintChange[]): string[] {
  const buckets = new Map<string, number>();
  for (const c of changes) {
    if (c.target !== 'node' || !c.nodeKind) continue;
    const sign = c.kind === 'added' ? '+' : c.kind === 'removed' ? '-' : '~';
    const label = NODE_KIND_LABELS[c.nodeKind] ?? c.nodeKind;
    const key = `${sign}${label}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(
    ([k, n]) => `${k.charAt(0)}${n} ${k.slice(1)}${n > 1 ? 's' : ''}`,
  );
}
