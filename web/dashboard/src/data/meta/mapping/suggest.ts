/**
 * MAPPING DOMAIN — heuristic suggestion engine.
 *
 * Pure, deterministic scoring of a Blueprint source item against Nexus Library
 * definitions. Kept isolated behind this module so an AI provider can replace
 * or augment it later without touching the rest of the domain.
 *
 * No CMS-specific logic — operates on the normalized graph + canonical library.
 */

import { toNexusFieldType, slugify } from '@/data/meta/design/normalize';
import type { LibraryDefinitionView } from '@/data/meta/design/dto';
import type { FieldSuggestion, SuggestionScore } from './types';

export interface SourceField {
  name: string;
  type: string;
  required?: boolean;
}

export interface SourceItem {
  key: string;
  name: string;
  kind: string; // component | contentType | layout
  group?: string;
  fields: SourceField[];
}

/** Normalized token set of a name for fuzzy comparison. */
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Fraction of source fields that align (by name + normalized type) with target. */
function fieldOverlap(source: SourceField[], target: LibraryDefinitionView): number {
  if (source.length === 0) return 0;
  const targetByName = new Map(
    target.dialog.dialog.map((f) => [f.name.toLowerCase(), f]),
  );
  let aligned = 0;
  for (const sf of source) {
    const tf = targetByName.get(sf.name.toLowerCase());
    if (!tf) continue;
    const wantType = toNexusFieldType(sf.type).type;
    if (tf.type === wantType) aligned += 1;
    else aligned += 0.5; // name matches, type differs
  }
  return aligned / source.length;
}

/**
 * Rank same-kind Library definitions for a source item.
 * confidence 0..100 combining name similarity, exact-key, and field overlap.
 */
export function suggestTargets(
  source: SourceItem,
  definitions: LibraryDefinitionView[],
): SuggestionScore[] {
  const sameKind = definitions.filter((d) => d.kind === source.kind);
  const srcTokens = tokens(source.name);
  const srcKey = slugify(source.name);

  const scored = sameKind.map((d) => {
    const nameSim = jaccard(srcTokens, tokens(d.name));
    const exactKey = d.key === srcKey ? 1 : 0;
    const overlap = source.kind === 'layout' ? 0 : fieldOverlap(source.fields, d);

    // Weighted blend. Exact key dominates; then name; then fields.
    const raw =
      exactKey * 0.55 + nameSim * 0.3 + overlap * 0.15 + (exactKey ? 0 : 0);
    const confidence = Math.round(Math.min(1, raw) * 100);

    const reasons: string[] = [];
    if (exactKey) reasons.push('Exact key match');
    else if (nameSim > 0.4) reasons.push('Name similarity');
    if (overlap > 0) reasons.push(`${Math.round(overlap * 100)}% fields align`);

    return {
      definitionId: d.id,
      key: d.key,
      name: d.name,
      confidence,
      reason: reasons.join(' · ') || 'Weak match',
    };
  });

  return scored
    .filter((s) => s.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
}

/** Suggest per-field mappings from a source item to a chosen target definition. */
export function suggestFieldMap(
  source: SourceField[],
  target: LibraryDefinitionView,
): FieldSuggestion[] {
  const targetFields = target.dialog.dialog;
  const targetByName = new Map(
    targetFields.map((f) => [f.name.toLowerCase(), f]),
  );
  return source.map((sf) => {
    const exact = targetByName.get(sf.name.toLowerCase());
    const wantType = toNexusFieldType(sf.type).type;
    if (exact) {
      const same = exact.type === wantType;
      return {
        sourceField: sf.name,
        targetField: exact.name,
        confidence: same ? 100 : 70,
        transform: same ? undefined : 'Map properties',
      };
    }
    // Try a same-type target field as a fallback.
    const byType = targetFields.find((f) => f.type === wantType);
    if (byType) {
      return {
        sourceField: sf.name,
        targetField: byType.name,
        confidence: 40,
        transform: wantType === 'media' ? 'Convert to asset ref' : undefined,
      };
    }
    return { sourceField: sf.name, targetField: null, confidence: 0 };
  });
}
