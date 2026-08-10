/**
 * Capability + Feature helpers (client-safe).
 *
 * Capabilities are what a *connection* supports (discovered live). Features are
 * rich descriptors a *connector* exposes. Engines/UI use `supports()` rather
 * than branching on CMS type.
 */

import type { Capability, CapabilityKey, Feature } from './types';

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  cloud: 'Cloud Service',
  'on-prem': 'On-Premise',
  graphql: 'GraphQL',
  rest: 'REST API',
  assets: 'Assets API',
  'content-fragments': 'Content Fragments',
  'editable-templates': 'Editable Templates',
  translation: 'Translation',
  publishing: 'Publishing',
  workflow: 'Workflow',
};

/** Does a list of discovered capabilities support a given key? */
export function supports(
  capabilities: Capability[] | undefined,
  key: CapabilityKey,
): boolean {
  return !!capabilities?.some((c) => c.key === key && c.supported);
}

/** Count supported / missing capabilities. */
export function capabilityStats(capabilities: Capability[]) {
  const supported = capabilities.filter((c) => c.supported).length;
  return { supported, missing: capabilities.length - supported };
}

export function isFeatureUsable(
  feature: Feature,
  all: Feature[],
): boolean {
  if (!feature.supported) return false;
  if (!feature.requires?.length) return true;
  return feature.requires.every((req) =>
    all.some((f) => f.id === req && f.supported),
  );
}
