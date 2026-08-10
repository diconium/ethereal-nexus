/**
 * DESIGN DOMAIN — normalization.
 *
 * Pure functions that turn the (already CMS-normalized) Blueprint output into
 * canonical Nexus Library definitions expressed in the Nexus dialog schema.
 *
 * This is CMS-agnostic: it consumes the generic field-type strings and region
 * shapes the connectors emit, never CMS specifics.
 */

import type {
  LayoutComposition,
  MetaRegion,
  NexusDialogEntry,
  NexusDialogJson,
  NexusFieldType,
  RegionLocation,
} from './types';

/** A discovered field as carried in a Blueprint node's attributes. */
export interface DiscoveredField {
  name: string;
  type: string;
  required?: boolean;
}

/** Map a normalized field-type label to a Nexus dialog field type + extras. */
export function toNexusFieldType(type: string): {
  type: NexusFieldType;
  extras?: Partial<NexusDialogEntry>;
} {
  const t = type.toLowerCase();
  if (t.includes('rich')) return { type: 'richtexteditor' };
  if (t.includes('reference') && t.includes('asset'))
    return { type: 'media' };
  if (t.includes('reference')) return { type: 'pathbrowser' };
  if (t.includes('number')) return { type: 'textfield', extras: { inputType: 'number' } };
  if (t.includes('bool')) return { type: 'checkbox' };
  if (t.includes('select')) return { type: 'select', extras: { values: [] } };
  if (t.includes('date') || t.includes('calendar')) return { type: 'calendar' };
  if (t.includes('list') || t.includes('multi')) return { type: 'multifield', extras: { fields: [] } };
  if (t.includes('nested') || t.includes('group')) return { type: 'group', extras: { fields: [] } };
  if (t.includes('tag')) return { type: 'tags' };
  return { type: 'textfield' };
}

/** Turn a field name into a human label. */
function labelize(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Build a Nexus dialog from a list of discovered fields. */
export function toNexusDialog(fields: DiscoveredField[]): NexusDialogJson {
  const entries: NexusDialogEntry[] = fields.map((f) => {
    const { type, extras } = toNexusFieldType(f.type);
    return {
      id: f.name,
      name: f.name,
      type,
      label: labelize(f.name),
      required: f.required === true,
      ...extras,
    };
  });
  return { dialog: entries };
}

/** Normalize a discovered region location string to a canonical location. */
export function toRegionLocation(raw: string | undefined): RegionLocation {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('global')) return 'global';
  if (v.includes('top')) return 'top';
  if (v.includes('container')) return 'container';
  if (v.includes('right')) return 'right';
  if (v.includes('left')) return 'left';
  if (v.includes('bottom')) return 'bottom';
  return 'content';
}

/**
 * Build a Layout composition from discovered region strings
 * ("Header:Global", …) and the component keys the layout uses.
 */
export function toLayoutComposition(
  regionStrings: string[],
  usesComponentKeys: string[],
): LayoutComposition {
  const regions: MetaRegion[] = regionStrings.map((s, i) => {
    const [name, location] = s.split(':');
    const clean = (name ?? s).trim();
    return {
      key: slugify(clean) || `region-${i}`,
      name: clean,
      location: toRegionLocation(location),
      allowedComponentKeys: [],
    };
  });
  return { regions, usesComponentKeys };
}

/** Stable key from a name / resource type. */
export function slugify(input: string): string {
  return input
    .split('/')
    .filter(Boolean)
    .pop()!
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
