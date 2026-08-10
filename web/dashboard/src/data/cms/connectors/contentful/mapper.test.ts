/**
 * @jest-environment node
 */
import {
  contentfulFieldToNexusType,
  linkContentTypes,
  contentTypeToNode,
  usesAssets,
  provisionFieldToContentful,
  nexusTypeToProvisionKind,
  ids,
} from './mapper';
import type { ContentfulContentType, ContentfulField } from './client';
import type { ProvisionField } from '@/data/meta/provision/types';

function field(partial: Partial<ContentfulField> & { id: string }): ContentfulField {
  return { name: partial.id, type: 'Symbol', ...partial };
}

describe('contentfulFieldToNexusType', () => {
  it('maps scalar types', () => {
    expect(contentfulFieldToNexusType(field({ id: 't', type: 'Symbol' }))).toBe('Text');
    expect(contentfulFieldToNexusType(field({ id: 't', type: 'Text' }))).toBe('Long Text');
    expect(contentfulFieldToNexusType(field({ id: 't', type: 'RichText' }))).toBe('Rich Text');
    expect(contentfulFieldToNexusType(field({ id: 't', type: 'Integer' }))).toBe('Number');
    expect(contentfulFieldToNexusType(field({ id: 't', type: 'Boolean' }))).toBe('Boolean');
  });

  it('distinguishes entry vs asset links', () => {
    expect(
      contentfulFieldToNexusType(field({ id: 'l', type: 'Link', linkType: 'Entry' })),
    ).toBe('Reference (Entry)');
    expect(
      contentfulFieldToNexusType(field({ id: 'l', type: 'Link', linkType: 'Asset' })),
    ).toBe('Reference (Asset)');
  });

  it('handles arrays of links', () => {
    expect(
      contentfulFieldToNexusType(
        field({ id: 'a', type: 'Array', items: { type: 'Link', linkType: 'Entry' } }),
      ),
    ).toBe('List (Entries)');
  });
});

describe('linkContentTypes', () => {
  it('reads linkContentType from a single link validation', () => {
    const f = field({
      id: 'ref',
      type: 'Link',
      linkType: 'Entry',
      validations: [{ linkContentType: ['hero', 'teaser'] }],
    });
    expect(linkContentTypes(f)).toEqual(['hero', 'teaser']);
  });

  it('reads linkContentType from array items', () => {
    const f = field({
      id: 'refs',
      type: 'Array',
      items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['card'] }] },
    });
    expect(linkContentTypes(f)).toEqual(['card']);
  });
});

describe('contentTypeToNode', () => {
  const ct: ContentfulContentType = {
    sys: { id: 'page', type: 'ContentType', version: 3 },
    name: 'Page',
    displayField: 'title',
    fields: [
      field({ id: 'title', type: 'Symbol', required: true }),
      field({
        id: 'hero',
        type: 'Link',
        linkType: 'Entry',
        validations: [{ linkContentType: ['hero'] }],
      }),
      field({ id: 'image', type: 'Link', linkType: 'Asset' }),
    ],
  };

  it('produces a model node with fields + contentful metadata', () => {
    const { node } = contentTypeToNode(ct);
    expect(node.kind).toBe('model');
    expect(node.externalId).toBe(ids.contentType('page'));
    expect(node.attributes?.['contentful.id']).toBe('page');
    expect(node.attributes?.['contentful.displayField']).toBe('title');
    const fields = node.attributes?.fields as { name: string; required?: boolean }[];
    expect(fields.map((f) => f.name)).toEqual(['title', 'hero', 'image']);
  });

  it('emits a references edge for constrained entry links only', () => {
    const { edges } = contentTypeToNode(ct);
    expect(edges).toEqual([
      { fromExternalId: ids.contentType('page'), toExternalId: ids.contentType('hero'), type: 'references' },
    ]);
  });

  it('flags asset usage', () => {
    expect(usesAssets(ct)).toBe(true);
  });
});

describe('provisionFieldToContentful', () => {
  const base = { key: 'f', name: 'F' };

  it('maps text/select to Symbol', () => {
    expect(provisionFieldToContentful({ ...base, kind: 'text' }).type).toBe('Symbol');
  });

  it('maps richText/boolean/date/number/location/json', () => {
    expect(provisionFieldToContentful({ ...base, kind: 'richText' }).type).toBe('RichText');
    expect(provisionFieldToContentful({ ...base, kind: 'boolean' }).type).toBe('Boolean');
    expect(provisionFieldToContentful({ ...base, kind: 'date' }).type).toBe('Date');
    expect(provisionFieldToContentful({ ...base, kind: 'number' }).type).toBe('Number');
    expect(provisionFieldToContentful({ ...base, kind: 'location' }).type).toBe('Location');
    expect(provisionFieldToContentful({ ...base, kind: 'json' }).type).toBe('Object');
  });

  it('maps asset to Link<Asset> (single) and Array (multiple)', () => {
    const single = provisionFieldToContentful({ ...base, kind: 'asset' });
    expect(single.type).toBe('Link');
    expect(single.linkType).toBe('Asset');
    const multi = provisionFieldToContentful({ ...base, kind: 'asset', multiple: true });
    expect(multi.type).toBe('Array');
    expect(multi.items?.linkType).toBe('Asset');
  });

  it('maps reference to Link<Entry> with linkContentType validation', () => {
    const f: ProvisionField = {
      ...base,
      kind: 'reference',
      linkContentTypeKeys: ['hero', 'teaser'],
    };
    const cf = provisionFieldToContentful(f);
    expect(cf.type).toBe('Link');
    expect(cf.linkType).toBe('Entry');
    expect(cf.validations?.[0].linkContentType).toEqual(['hero', 'teaser']);
  });

  it('adds an `in` validation for allowedValues', () => {
    const cf = provisionFieldToContentful({ ...base, kind: 'select', allowedValues: ['a', 'b'] });
    expect(cf.validations?.[0].in).toEqual(['a', 'b']);
  });
});

describe('nexusTypeToProvisionKind', () => {
  it('maps nexus dialog types to provision kinds', () => {
    expect(nexusTypeToProvisionKind('textfield')).toBe('text');
    expect(nexusTypeToProvisionKind('richtexteditor')).toBe('richText');
    expect(nexusTypeToProvisionKind('media')).toBe('asset');
    expect(nexusTypeToProvisionKind('checkbox')).toBe('boolean');
    expect(nexusTypeToProvisionKind('datamodel')).toBe('reference');
    expect(nexusTypeToProvisionKind('group')).toBe('json');
  });
});
