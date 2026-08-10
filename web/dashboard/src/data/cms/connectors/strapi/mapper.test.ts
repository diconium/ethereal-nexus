/**
 * @jest-environment node
 *
 * Pure unit tests for the StrapiMapper.
 * No network calls — only pure function coverage.
 */

import {
  strapiAttributeToNexusLabel,
  strapiAttributeToProvisionKind,
  nexusTypeToProvisionKind,
  provisionFieldToStrapi,
  provisionRoleToStrapiKind,
  contentTypeToNodes,
  componentToNodes,
  localeToNode,
  keyToContentTypeUid,
  keyToComponentUid,
  keyToStrapiNames,
  ids,
} from './mapper';
import type { StrapiAttribute, StrapiContentType, StrapiComponent, StrapiLocale } from './client';
import type { ProvisionField } from '@/data/meta/provision/types';

/* ------------------- strapiAttributeToNexusLabel ------------------- */

describe('strapiAttributeToNexusLabel', () => {
  const cases: [StrapiAttribute['type'], string][] = [
    ['string', 'Text'],
    ['uid', 'Text'],
    ['email', 'Text'],
    ['password', 'Text'],
    ['text', 'Long Text'],
    ['richtext', 'Rich Text'],
    ['integer', 'Number'],
    ['biginteger', 'Number'],
    ['float', 'Number'],
    ['decimal', 'Number'],
    ['boolean', 'Boolean'],
    ['date', 'Date'],
    ['datetime', 'Date & Time'],
    ['time', 'Time'],
    ['enumeration', 'Enumeration'],
    ['json', 'JSON'],
    ['relation', 'Relation (unknown)'],
    ['dynamiczone', 'Dynamic Zone'],
  ];

  it.each(cases)('type "%s" → label "%s"', (type, expected) => {
    const attr = { type } as StrapiAttribute;
    expect(strapiAttributeToNexusLabel(attr)).toBe(expected);
  });

  it('media single → "Media"', () => {
    expect(strapiAttributeToNexusLabel({ type: 'media', multiple: false })).toBe('Media');
  });

  it('media multiple → "Media (multiple)"', () => {
    expect(strapiAttributeToNexusLabel({ type: 'media', multiple: true })).toBe('Media (multiple)');
  });

  it('component non-repeatable → "Component"', () => {
    expect(strapiAttributeToNexusLabel({ type: 'component', repeatable: false })).toBe('Component');
  });

  it('component repeatable → "Component (repeatable)"', () => {
    expect(strapiAttributeToNexusLabel({ type: 'component', repeatable: true })).toBe('Component (repeatable)');
  });

  it('relation with type → "Relation (oneToMany)"', () => {
    expect(strapiAttributeToNexusLabel({ type: 'relation', relation: 'oneToMany' })).toBe('Relation (oneToMany)');
  });
});

/* ------------------- strapiAttributeToProvisionKind ------------------- */

describe('strapiAttributeToProvisionKind', () => {
  const cases: [StrapiAttribute['type'], string][] = [
    ['string', 'text'],
    ['email', 'text'],
    ['password', 'text'],
    ['uid', 'text'],
    ['text', 'richText'],
    ['richtext', 'richText'],
    ['integer', 'number'],
    ['biginteger', 'number'],
    ['float', 'number'],
    ['decimal', 'number'],
    ['boolean', 'boolean'],
    ['date', 'date'],
    ['datetime', 'date'],
    ['time', 'date'],
    ['enumeration', 'select'],
    ['json', 'json'],
    ['media', 'asset'],
    ['relation', 'reference'],
    ['component', 'reference'],
    ['dynamiczone', 'reference'],
  ];

  it.each(cases)('type "%s" → kind "%s"', (type, expected) => {
    expect(strapiAttributeToProvisionKind({ type } as StrapiAttribute)).toBe(expected);
  });
});

/* ------------------- nexusTypeToProvisionKind ------------------- */

describe('nexusTypeToProvisionKind', () => {
  it('textfield → text', () => expect(nexusTypeToProvisionKind('textfield')).toBe('text'));
  it('richtexteditor → richText', () => expect(nexusTypeToProvisionKind('richtexteditor')).toBe('richText'));
  it('checkbox → boolean', () => expect(nexusTypeToProvisionKind('checkbox')).toBe('boolean'));
  it('select → select', () => expect(nexusTypeToProvisionKind('select')).toBe('select'));
  it('calendar → date', () => expect(nexusTypeToProvisionKind('calendar')).toBe('date'));
  it('media → asset', () => expect(nexusTypeToProvisionKind('media')).toBe('asset'));
  it('pathbrowser → asset', () => expect(nexusTypeToProvisionKind('pathbrowser')).toBe('asset'));
  it('tags → tags', () => expect(nexusTypeToProvisionKind('tags')).toBe('tags'));
  it('datasource → reference', () => expect(nexusTypeToProvisionKind('datasource')).toBe('reference'));
  it('multifield → json', () => expect(nexusTypeToProvisionKind('multifield')).toBe('json'));
});

/* ------------------- provisionFieldToStrapi ------------------- */

describe('provisionFieldToStrapi', () => {
  const base: Omit<ProvisionField, 'kind'> = { key: 'title', name: 'Title' };

  it('text → string', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'text' });
    expect(attr.type).toBe('string');
  });

  it('richText → richtext', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'richText' });
    expect(attr.type).toBe('richtext');
  });

  it('number → integer', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'number' });
    expect(attr.type).toBe('integer');
  });

  it('boolean → boolean', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'boolean' });
    expect(attr.type).toBe('boolean');
  });

  it('date → datetime', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'date' });
    expect(attr.type).toBe('datetime');
  });

  it('select → enumeration with enum values', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'select', allowedValues: ['a', 'b'] });
    expect(attr.type).toBe('enumeration');
    expect(attr.enum).toEqual(['a', 'b']);
  });

  it('json → json', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'json' });
    expect(attr.type).toBe('json');
  });

  it('asset single → media with multiple=false', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'asset' });
    expect(attr.type).toBe('media');
    expect(attr.multiple).toBe(false);
  });

  it('asset multiple → media with multiple=true', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'asset', multiple: true });
    expect(attr.type).toBe('media');
    expect(attr.multiple).toBe(true);
  });

  it('reference with linkContentTypeKeys → relation oneToOne', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'reference', linkContentTypeKeys: ['api::author.author'] });
    expect(attr.type).toBe('relation');
    expect(attr.relation).toBe('oneToOne');
    expect(attr.target).toBe('api::author.author');
  });

  it('reference multiple → relation oneToMany', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'reference', linkContentTypeKeys: ['api::author.author'], multiple: true });
    expect(attr.relation).toBe('oneToMany');
  });

  it('required field sets required=true', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'text', required: true });
    expect(attr.required).toBe(true);
  });

  it('i18n enabled + localized → pluginOptions.i18n.localized=true', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'text', localized: true }, { i18nEnabled: true });
    expect(attr.pluginOptions?.i18n?.localized).toBe(true);
  });

  it('i18n disabled → no pluginOptions', () => {
    const attr = provisionFieldToStrapi({ ...base, kind: 'text', localized: true }, { i18nEnabled: false });
    expect(attr.pluginOptions).toBeUndefined();
  });
});

/* ------------------- provisionRoleToStrapiKind ------------------- */

describe('provisionRoleToStrapiKind', () => {
  it('contentType → collectionType', () => {
    expect(provisionRoleToStrapiKind('contentType')).toBe('collectionType');
  });

  it('layout defaults → collectionType', () => {
    expect(provisionRoleToStrapiKind('layout')).toBe('collectionType');
  });

  it('layout with singleType strategy → singleType', () => {
    expect(provisionRoleToStrapiKind('layout', 'singleType')).toBe('singleType');
  });
});

/* ------------------- contentTypeToNodes ------------------- */

describe('contentTypeToNodes', () => {
  const baseContentType: StrapiContentType = {
    uid: 'api::article.article',
    apiID: 'article',
    kind: 'collectionType',
    info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
    attributes: {},
  };

  it('collectionType → model node', () => {
    const { nodes } = contentTypeToNodes(baseContentType);
    const ctNode = nodes.find((n) => n.externalId === ids.contentType('api::article.article'));
    expect(ctNode?.kind).toBe('model');
    expect(ctNode?.layer).toBe('definition');
    expect(ctNode?.attributes?.['strapi.kind']).toBe('collectionType');
  });

  it('singleType → template node', () => {
    const st: StrapiContentType = { ...baseContentType, kind: 'singleType' };
    const { nodes } = contentTypeToNodes(st);
    expect(nodes[0].kind).toBe('template');
  });

  it('relation attribute → reference node + references edge + contains edge', () => {
    const ct: StrapiContentType = {
      ...baseContentType,
      attributes: {
        author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      },
    };
    const { nodes, edges } = contentTypeToNodes(ct);
    const refNode = nodes.find((n) => n.kind === 'reference');
    expect(refNode).toBeDefined();
    expect(refNode?.attributes?.['strapi.target']).toBe('api::author.author');

    const containsEdge = edges.find((e) => e.type === 'contains' && e.toExternalId === refNode?.externalId);
    expect(containsEdge).toBeDefined();

    const referencesEdge = edges.find((e) => e.type === 'references' && e.toExternalId === ids.contentType('api::author.author'));
    expect(referencesEdge).toBeDefined();
  });

  it('media attribute → asset node + uses edge to media library', () => {
    const ct: StrapiContentType = {
      ...baseContentType,
      attributes: {
        cover: { type: 'media', multiple: false },
      },
    };
    const { nodes, edges } = contentTypeToNodes(ct);
    const assetNode = nodes.find((n) => n.kind === 'asset');
    expect(assetNode).toBeDefined();
    const usesEdge = edges.find((e) => e.type === 'uses' && e.toExternalId === ids.assetFolder());
    expect(usesEdge).toBeDefined();
  });

  it('dynamiczone attribute → template node + contains edge + uses edges to components', () => {
    const ct: StrapiContentType = {
      ...baseContentType,
      attributes: {
        sections: { type: 'dynamiczone', components: ['shared.hero', 'shared.cta'] },
      },
    };
    const { nodes, edges } = contentTypeToNodes(ct);
    const dzNode = nodes.find((n) => n.kind === 'template' && n.attributes?.['strapi.type'] === 'dynamicZone');
    expect(dzNode).toBeDefined();
    const usesEdges = edges.filter((e) => e.type === 'uses');
    expect(usesEdges).toHaveLength(2);
  });

  it('component attribute → field node + uses edge to component', () => {
    const ct: StrapiContentType = {
      ...baseContentType,
      attributes: {
        seo: { type: 'component', component: 'shared.seo', repeatable: false },
      },
    };
    const { nodes, edges } = contentTypeToNodes(ct);
    const fieldNode = nodes.find((n) => n.attributes?.['strapi.type'] === 'component');
    expect(fieldNode).toBeDefined();
    const usesEdge = edges.find((e) => e.type === 'uses' && e.toExternalId === ids.component('shared.seo'));
    expect(usesEdge).toBeDefined();
  });

  it('scalar attributes accumulate in fields array on parent node', () => {
    const ct: StrapiContentType = {
      ...baseContentType,
      attributes: {
        title: { type: 'string', required: true },
        body: { type: 'richtext' },
      },
    };
    const { nodes } = contentTypeToNodes(ct);
    const ctNode = nodes[0];
    const fields = ctNode.attributes?.fields as Array<{ name: string }>;
    expect(fields?.find((f) => f.name === 'title')).toBeDefined();
    expect(fields?.find((f) => f.name === 'body')).toBeDefined();
  });

  it('ignores localizations and locale system attributes', () => {
    const ct: StrapiContentType = {
      ...baseContentType,
      attributes: {
        localizations: { type: 'relation', relation: 'oneToMany' },
        locale: { type: 'string' },
        title: { type: 'string' },
      },
    };
    const { nodes } = contentTypeToNodes(ct);
    const ctNode = nodes[0];
    const fields = ctNode.attributes?.fields as Array<{ name: string }>;
    // Only 'title' should appear — localizations and locale are stripped
    expect(fields?.find((f) => f.name === 'locale')).toBeUndefined();
    expect(fields?.find((f) => f.name === 'title')).toBeDefined();
  });
});

/* ------------------- componentToNodes ------------------- */

describe('componentToNodes', () => {
  const baseComponent: StrapiComponent = {
    uid: 'shared.seo',
    category: 'shared',
    apiID: 'seo',
    info: { displayName: 'Seo' },
    attributes: {
      metaTitle: { type: 'string', required: true },
      metaDescription: { type: 'text' },
    },
  };

  it('returns component node with correct kind and layer', () => {
    const { nodes } = componentToNodes(baseComponent);
    const compNode = nodes.find((n) => n.externalId === ids.component('shared.seo'));
    expect(compNode?.kind).toBe('component');
    expect(compNode?.layer).toBe('definition');
    expect(compNode?.attributes?.['strapi.category']).toBe('shared');
  });

  it('scalar attributes accumulate in fields array', () => {
    const { nodes } = componentToNodes(baseComponent);
    const compNode = nodes[0];
    const fields = compNode.attributes?.fields as Array<{ name: string }>;
    expect(fields?.find((f) => f.name === 'metaTitle')).toBeDefined();
    expect(fields?.find((f) => f.name === 'metaDescription')).toBeDefined();
  });
});

/* ------------------- localeToNode ------------------- */

describe('localeToNode', () => {
  const locale: StrapiLocale = { id: 1, code: 'en', name: 'English', isDefault: true };

  it('returns language node with correct structure', () => {
    const node = localeToNode(locale);
    expect(node.kind).toBe('language');
    expect(node.externalId).toBe(ids.locale('en'));
    expect(node.name).toBe('English');
    expect(node.attributes?.['strapi.code']).toBe('en');
    expect(node.attributes?.['strapi.isDefault']).toBe(true);
    expect(node.layer).toBe('snapshot');
  });
});

/* ------------------- UID helpers ------------------- */

describe('keyToContentTypeUid', () => {
  it('converts simple key to api:: UID', () => {
    expect(keyToContentTypeUid('article')).toBe('api::article.article');
  });

  it('converts hyphenated key', () => {
    expect(keyToContentTypeUid('blog-post')).toBe('api::blog-post.blog-post');
  });

  it('lowercases and sanitizes special characters', () => {
    expect(keyToContentTypeUid('My Article!')).toBe('api::my-article-.my-article-');
  });
});

describe('keyToComponentUid', () => {
  it('returns shared.<key> by default', () => {
    expect(keyToComponentUid('seo')).toBe('shared.seo');
  });

  it('respects custom category', () => {
    expect(keyToComponentUid('hero', 'sections')).toBe('sections.hero');
  });
});

describe('keyToStrapiNames', () => {
  it('generates display name from key', () => {
    const names = keyToStrapiNames('blog-post');
    expect(names.singularName).toBe('blog-post');
    expect(names.pluralName).toBe('blog-posts');
    // Hyphens are replaced by spaces and words are capitalised
    expect(names.displayName).toBe('Blog Post');
  });
});
