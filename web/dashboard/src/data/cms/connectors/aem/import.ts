/**
 * AEM content import: writes a NexusTree into AEM via the Sling POST servlet.
 *
 * Each NexusNode becomes a JCR node created or updated at its `fields.path`.
 * Protected paths (/libs/, /apps/) are skipped with a warning.
 * Concurrency is limited to 10 parallel requests to avoid overloading AEM.
 *
 * Server-only. Never import from client components.
 */

import type { AemConfig } from '../../config';
import type { ImportResult, NexusNode, NexusTree } from '../../types';
import { aemRequest } from './client';

const CONCURRENCY = 10;

/** JCR paths that must never be written to via import. */
const PROTECTED_PREFIXES = ['/libs/', '/apps/', '/system/', '/var/'];

function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Import a NexusTree into AEM by writing each node via the Sling POST servlet.
 *
 * @param config - AEM connection configuration (already decrypted).
 * @param tree   - The NexusTree to import.
 */
export async function importNexusTree(
  config: AemConfig,
  tree: NexusTree,
): Promise<ImportResult> {
  // Flatten the tree into a list of nodes.
  const nodes = flattenTree(tree.root);

  let created = 0;
  let updated = 0;
  let failed = 0;

  // Process in batches of CONCURRENCY.
  for (let i = 0; i < nodes.length; i += CONCURRENCY) {
    const batch = nodes.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((node) => importNode(config, node)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value === 'created') created++;
        else if (result.value === 'updated') updated++;
        else if (result.value === 'skipped') {
          // skipped protected paths count as neither created nor failed
        }
      } else {
        failed++;
      }
    }
  }

  return { ok: failed === 0, created, updated, failed };
}

async function importNode(
  config: AemConfig,
  node: NexusNode,
): Promise<'created' | 'updated' | 'skipped'> {
  const path = typeof node.fields.path === 'string' ? node.fields.path : node.id;

  if (isProtectedPath(path)) {
    return 'skipped';
  }

  // Build Sling POST form body.
  const params = new URLSearchParams();
  params.set('jcr:primaryType', node.type === 'page' ? 'cq:Page' : 'nt:unstructured');
  if (node.name) {
    params.set('jcr:content/jcr:title', node.name);
  }
  if (typeof node.fields.resourceType === 'string') {
    params.set('jcr:content/sling:resourceType', node.fields.resourceType);
  }
  // :operation is optional for Sling POST — default is createOrModify.

  const res = await aemRequest(config, path, {
    method: 'POST',
    body: params.toString(),
    contentType: 'application/x-www-form-urlencoded',
    withAuth: true,
  });

  if (!res.ok && !res.networkError) {
    throw new Error(`Sling POST to ${path} returned HTTP ${res.status}`);
  }
  if (res.networkError) {
    throw new Error(`Network error writing to ${path}: ${res.errorMessage}`);
  }

  // Sling POST returns 200 for update, 201 for create.
  return res.status === 201 ? 'created' : 'updated';
}

/** Flatten a NexusNode tree into a depth-first list. */
function flattenTree(node: NexusNode, acc: NexusNode[] = []): NexusNode[] {
  acc.push(node);
  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, acc);
    }
  }
  return acc;
}
