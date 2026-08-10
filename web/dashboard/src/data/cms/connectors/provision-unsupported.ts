/**
 * Shared "provisioning not supported" result for connectors that do not (yet)
 * implement `provision()`. Keeps the `CMSConnector` contract satisfied without
 * every connector re-declaring the same stub.
 */

import type { ProvisionResult } from '@/data/meta/provision/types';

export function provisionNotSupported(connectorName: string): ProvisionResult {
  return {
    ok: false,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    operations: [],
    message: `Provisioning is not supported by the ${connectorName} connector yet.`,
  };
}
