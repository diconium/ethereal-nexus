/**
 * MAPPING DOMAIN — types.
 *
 * The Mapping domain is the ONLY bridge between Discovery (Blueprint) and
 * Design (Nexus Library). It is project-owned; the Blueprint stays immutable
 * and the Library is referenced read-only.
 *
 * A mapping links each Blueprint node (source) to a Nexus Library definition
 * (target), with an optional per-field map and transforms.
 */

/** Link status — drives the colour system in the workbench. */
export const MAPPING_STATUSES = [
  'mapped', // green — confirmed by the user
  'needs-review', // yellow — heuristic auto-map, awaiting confirmation
  'missing', // red — no suitable target found
  'conflict', // purple — ambiguous / incompatible (auto-detected)
  'skipped', // grey — intentionally excluded
] as const;
export type MappingStatus = (typeof MAPPING_STATUSES)[number];

/** A single source→target field mapping with an optional transform. */
export interface FieldMapEntry {
  sourceField: string;
  targetField: string;
  /** Free-form transform hint, e.g. "Convert to asset ref", "Map properties". */
  transform?: string;
}

/** A ranked target suggestion for a source item (heuristic; AI-ready). */
export interface SuggestionScore {
  definitionId: string;
  key: string;
  name: string;
  /** 0..100. */
  confidence: number;
  /** Human explanation, e.g. "Exact name match + 5/6 fields align". */
  reason: string;
}

/** A field-level suggestion (source field → target field). */
export interface FieldSuggestion {
  sourceField: string;
  targetField: string | null;
  confidence: number;
  transform?: string;
}

/** A persisted mapping link. */
export interface MappingLink {
  id: string;
  mappingId: string;
  blueprintKind: string;
  blueprintNodeKey: string;
  blueprintNodeName: string;
  targetDefinitionId: string | null;
  status: MappingStatus;
  confidence: number;
  fieldMap: FieldMapEntry[];
  transform: Record<string, unknown>;
  note: string | null;
}

export interface NexusMappingRow {
  id: string;
  projectId: string;
  blueprintDefinitionId: string;
  libraryId: string;
  targetConnectionId: string | null;
  name: string;
}
