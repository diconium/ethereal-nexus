/**
 * AEM content publishing: triggers replication via /bin/replicate.json.
 *
 * Paths are batched in groups of 50 to avoid request size limits.
 * AEM replication is asynchronous on the server side — submission success
 * is sufficient; this function does not wait for publication to complete.
 *
 * Server-only. Never import from client components.
 */

import type { AemConfig } from '../../config';
import { aemRequest } from './client';

const BATCH_SIZE = 50;

/**
 * Trigger AEM replication (Activate) for the given node paths.
 *
 * @param config - AEM connection configuration (already decrypted).
 * @param ids    - Array of JCR paths to activate (e.g. ["/content/stihl/en/home"]).
 */
export async function replicateNodes(
  config: AemConfig,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;

  // Process in batches.
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    await replicateBatch(config, batch);
  }
}

async function replicateBatch(
  config: AemConfig,
  paths: string[],
): Promise<void> {
  const params = new URLSearchParams();
  params.set('cmd', 'Activate');
  for (const path of paths) {
    params.append('path', path);
  }

  const res = await aemRequest(config, '/bin/replicate.json', {
    method: 'POST',
    body: params.toString(),
    contentType: 'application/x-www-form-urlencoded',
    withAuth: true,
  });

  if (res.networkError) {
    throw new Error(
      `Replication request failed: ${res.errorMessage ?? 'network error'}`,
    );
  }
  if (!res.ok) {
    throw new Error(`Replication returned HTTP ${res.status}`);
  }
}
