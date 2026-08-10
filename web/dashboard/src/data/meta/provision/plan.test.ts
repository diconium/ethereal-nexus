/**
 * @jest-environment node
 */
import type { LibraryDefinitionView } from '@/data/meta/design/dto';

/* ------------------------------- mocks -------------------------------- */

const mappingRow = {
  id: 'map1',
  project_id: 'proj1',
  name: 'AEM → Nexus Library',
};

// Mapping links: hero (mapped), teaser (needs-review), footer (skipped),
// page (mapped layout using hero).
const linkRows = [
  {
    status: 'mapped',
    target_definition_id: 'def-hero',
    blueprint_kind: 'component',
    blueprint_node_key: 'hero',
  },
  {
    status: 'needs-review',
    target_definition_id: 'def-teaser',
    blueprint_kind: 'component',
    blueprint_node_key: 'teaser',
  },
  {
    status: 'skipped',
    target_definition_id: 'def-footer',
    blueprint_kind: 'component',
    blueprint_node_key: 'footer',
  },
  {
    status: 'mapped',
    target_definition_id: 'def-page',
    blueprint_kind: 'layout',
    blueprint_node_key: 'page',
  },
  // missing target — ignored
  {
    status: 'mapped',
    target_definition_id: null,
    blueprint_kind: 'component',
    blueprint_node_key: 'orphan',
  },
];

// Sequence of resolved query results, in call order:
//   1) select mapping        → [mappingRow]
//   2) select mapping links  → linkRows
let selectResults: unknown[][] = [];
let callIndex = 0;

jest.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => {
          const r = selectResults[callIndex] ?? [];
          callIndex += 1;
          return r;
        },
      }),
    }),
  },
}));

const definitions: LibraryDefinitionView[] = [
  {
    id: 'def-hero',
    libraryId: 'lib1',
    kind: 'component',
    key: 'hero',
    name: 'Hero',
    group: null,
    status: 'generated',
    description: 'A hero',
    tags: [],
    dialog: {
      dialog: [
        {
          id: 'f1',
          name: 'title',
          type: 'textfield',
          label: 'Title',
          required: true,
        },
        { id: 'f2', name: 'image', type: 'media', label: 'Image' },
      ],
    },
    composition: null,
    sourceHint: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'def-teaser',
    libraryId: 'lib1',
    kind: 'component',
    key: 'teaser',
    name: 'Teaser',
    group: null,
    status: 'generated',
    description: null,
    tags: [],
    dialog: { dialog: [{ id: 't1', name: 'text', type: 'richtexteditor', label: 'Text' }] },
    composition: null,
    sourceHint: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'def-page',
    libraryId: 'lib1',
    kind: 'layout',
    key: 'page',
    name: 'Page',
    group: null,
    status: 'generated',
    description: null,
    tags: [],
    dialog: { dialog: [] },
    composition: { regions: [], usesComponentKeys: ['hero', 'nonexistent'] },
    sourceHint: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

jest.mock('@/data/meta/design/actions', () => ({
  getNexusLibrary: async () => ({
    success: true,
    data: { id: 'lib1', projectId: 'proj1', name: 'Library', definitions },
  }),
}));

// Import AFTER mocks are registered.
import { buildProvisionPlan, nexusTypeToProvisionKind } from './plan';

beforeEach(() => {
  callIndex = 0;
  selectResults = [[mappingRow], linkRows];
});

describe('nexusTypeToProvisionKind', () => {
  it('maps meta types to provision kinds', () => {
    expect(nexusTypeToProvisionKind('textfield')).toBe('text');
    expect(nexusTypeToProvisionKind('media')).toBe('asset');
    expect(nexusTypeToProvisionKind('datamodel')).toBe('reference');
    expect(nexusTypeToProvisionKind('checkbox')).toBe('boolean');
    expect(nexusTypeToProvisionKind('group')).toBe('json');
  });
});

describe('buildProvisionPlan', () => {
  it('includes only mapped/needs-review links with a target', async () => {
    const plan = await buildProvisionPlan('map1');
    const keys = plan.contentTypes.map((c) => c.key).sort();
    // hero + teaser + page (footer skipped, orphan has no target)
    expect(keys).toEqual(['hero', 'page', 'teaser']);
  });

  it('converts dialog fields into provision fields', async () => {
    const plan = await buildProvisionPlan('map1');
    const hero = plan.contentTypes.find((c) => c.key === 'hero');
    expect(hero?.fields.map((f) => ({ key: f.key, kind: f.kind }))).toEqual([
      { key: 'title', kind: 'text' },
      { key: 'image', kind: 'asset' },
    ]);
    // displayField = first text field
    expect(hero?.displayFieldKey).toBe('title');
  });

  it('sets layout role and prunes usesTypeKeys to included types', async () => {
    const plan = await buildProvisionPlan('map1');
    const page = plan.contentTypes.find((c) => c.key === 'page');
    expect(page?.role).toBe('layout');
    // 'hero' is included; 'nonexistent' is pruned
    expect(page?.usesTypeKeys).toEqual(['hero']);
  });

  it('carries plan metadata + default options', async () => {
    const plan = await buildProvisionPlan('map1');
    expect(plan.id).toBe('map1');
    expect(plan.projectId).toBe('proj1');
    expect(plan.options).toEqual({ publish: true, onConflict: 'update' });
  });
});
