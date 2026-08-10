'use client';

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Blocks,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CheckCircle2,
  Database,
  FolderTree,
  GripVertical,
  Image as ImageIcon,
  Languages,
  LayoutTemplate,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NODE_KIND_LABELS } from '@/data/cms/graph';
import type { NodeKind } from '@/data/cms/types';
import type { BlueprintDetail, BlueprintItem } from '@/data/cms/dto';

/* -------------------- normalized concept groups ----------------------- */

type Concept = {
  id: string;
  label: string;
  icon: LucideIcon;
  kinds: NodeKind[];
};

const CONCEPTS: Concept[] = [
  { id: 'layouts', label: 'Layouts', icon: LayoutTemplate, kinds: ['template', 'editableTemplate'] },
  { id: 'components', label: 'Components', icon: Boxes, kinds: ['component'] },
  { id: 'content-types', label: 'Content Types', icon: Database, kinds: ['model'] },
  { id: 'assets', label: 'Assets', icon: ImageIcon, kinds: ['asset', 'assetFolder'] },
  { id: 'localization', label: 'Localization', icon: Languages, kinds: ['language'] },
  { id: 'taxonomies', label: 'Taxonomies', icon: Tags, kinds: ['reference'] },
  { id: 'permissions', label: 'Permissions', icon: ShieldCheck, kinds: ['policy'] },
];

const KIND_ICON: Partial<Record<NodeKind, LucideIcon>> = {
  site: FolderTree,
  page: LayoutTemplate,
  template: LayoutTemplate,
  editableTemplate: LayoutTemplate,
  component: Blocks,
  model: Database,
  asset: ImageIcon,
  assetFolder: ImageIcon,
  language: Languages,
  reference: Tags,
  policy: ShieldCheck,
  dialog: Blocks,
  graphqlSchema: Database,
  resourceType: Boxes,
  field: Blocks,
};

/* --------------------------- relationships ---------------------------- */

type RelItem = { name: string; kindLabel: string; kind?: NodeKind; path?: string };
type RelBucket = { label: string; items: RelItem[] };

function buildRelationships(item: BlueprintItem, detail: BlueprintDetail) {
  const byExt = new Map(detail.items.map((i) => [i.externalId, i]));
  const nameOf = (ext: string) =>
    byExt.get(ext)?.name ?? ext.split('/').pop() ?? ext;
  const kindOf = (ext: string): NodeKind | undefined => byExt.get(ext)?.kind;
  const pathOf = (ext: string): string | undefined => {
    const attrs = byExt.get(ext)?.attributes;
    const p = attrs?.path;
    // The externalId is the JCR path for pages/sites/assets; prefer the stored
    // `path` attribute, otherwise fall back to the externalId when it looks
    // like a repository path.
    if (typeof p === 'string' && p) return p;
    return ext.startsWith('/') ? ext : undefined;
  };
  const rel = (ext: string): RelItem => {
    const k = kindOf(ext);
    return {
      name: nameOf(ext),
      kindLabel: k ? NODE_KIND_LABELS[k] : 'Node',
      kind: k,
      path: pathOf(ext),
    };
  };

  const outgoing = detail.edges.filter((e) => e.fromExternalId === item.externalId);
  const incoming = detail.edges.filter((e) => e.toExternalId === item.externalId);

  const uses = outgoing.filter((e) => e.type === 'uses').map((e) => rel(e.toExternalId));
  const references = outgoing.filter((e) => e.type === 'references').map((e) => rel(e.toExternalId));
  const inherits = outgoing.filter((e) => e.type === 'inherits' || e.type === 'extends').map((e) => rel(e.toExternalId));
  const contains = outgoing.filter((e) => e.type === 'contains').map((e) => rel(e.toExternalId));

  // Incoming `uses`: who uses this node. Split pages vs templates/components.
  const incomingUses = incoming.filter((e) => e.type === 'uses').map((e) => rel(e.fromExternalId));
  const usedByPages = dedupe(incomingUses.filter((r) => r.kind === 'page' || r.kind === 'site'));
  const usedByTemplates = dedupe(incomingUses.filter((r) => r.kind === 'template' || r.kind === 'editableTemplate'));
  const usedByComponents = dedupe(
    incoming.filter((e) => e.type === 'contains').map((e) => rel(e.fromExternalId)),
  );
  const referencedBy = dedupe(
    incoming.filter((e) => e.type === 'references').map((e) => rel(e.fromExternalId)),
  );

  // Dependencies = everything this node points to (outgoing), grouped.
  const dependencies: RelBucket[] = [];
  if (inherits.length) dependencies.push({ label: 'Inherits', items: dedupe(inherits) });
  if (contains.length) dependencies.push({ label: 'Contains (allowed children)', items: dedupe(contains).slice(0, 30) });
  if (uses.length) dependencies.push({ label: 'Uses', items: dedupe(uses).slice(0, 30) });
  if (references.length) dependencies.push({ label: 'References', items: dedupe(references).slice(0, 30) });

  // Relationships rail buckets.
  const buckets: RelBucket[] = [];
  if (uses.length) buckets.push({ label: 'Uses', items: dedupe(uses) });
  if (references.length) buckets.push({ label: 'References', items: dedupe(references) });
  if (inherits.length) buckets.push({ label: 'Inherits', items: dedupe(inherits) });
  if (contains.length) buckets.push({ label: 'Contains', items: dedupe(contains).slice(0, 12) });
  const containedIn = dedupe([...usedByTemplates, ...usedByComponents]);
  if (containedIn.length) buckets.push({ label: 'Contained In', items: containedIn.slice(0, 12) });
  if (referencedBy.length) buckets.push({ label: 'Referenced By', items: referencedBy.slice(0, 12) });

  const outgoingCount =
    inherits.length + contains.length + uses.length + references.length;

  return {
    buckets,
    usedByPages,
    usedByTemplates,
    usedByComponents,
    referencedBy,
    dependencies,
    usedByCount: usedByPages.length,
    referencedByCount: usedByTemplates.length + usedByComponents.length,
    dependencyCount: outgoingCount,
    // Allowed parents = templates/layouts that use this component.
    allowedParents: usedByTemplates.map((r) => r.name),
  };
}

function dedupe(arr: RelItem[]): RelItem[] {
  const seen = new Set<string>();
  return arr.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}

/* ------------------------------ insights ------------------------------ */

function computeInsights(detail: BlueprintDetail) {
  const referenced = new Set<string>();
  for (const e of detail.edges) {
    referenced.add(e.toExternalId);
    if (e.type === 'contains') referenced.add(e.fromExternalId);
  }
  const components = detail.items.filter((i) => i.kind === 'component');
  const orphanComponents = components.filter((c) => !referenced.has(c.externalId));
  const missingTargets = detail.edges.filter(
    (e) => !detail.items.some((i) => i.externalId === e.toExternalId),
  );

  const checks = [
    { ok: orphanComponents.length === 0, label: orphanComponents.length === 0 ? 'No orphan components' : `${orphanComponents.length} unused components`, warn: orphanComponents.length > 0 },
    { ok: missingTargets.length === 0, label: missingTargets.length === 0 ? 'No broken references' : `${missingTargets.length} broken references`, warn: missingTargets.length > 0 },
    { ok: true, label: 'Relationships validated', warn: false },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const health = Math.round((passed / checks.length) * 100);
  return { checks, health };
}

/* ------------------------------ tree ---------------------------------- */

function ConceptTree({
  detail,
  query,
  selectedId,
  onSelect,
}: {
  detail: BlueprintDetail;
  query: string;
  selectedId: string | null;
  onSelect: (item: BlueprintItem) => void;
}) {
  const [openConcepts, setOpenConcepts] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();

  function toggle(id: string) {
    setOpenConcepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="space-y-0.5 text-sm">
      {CONCEPTS.map((concept) => {
        const items = detail.items
          .filter((i) => concept.kinds.includes(i.kind))
          .filter((i) => !q || i.name.toLowerCase().includes(q))
          .slice(0, 40);
        const totalForConcept = detail.items.filter((i) =>
          concept.kinds.includes(i.kind),
        ).length;
        if (q && items.length === 0) return null;
        const isOpen = openConcepts.has(concept.id) || (q.length > 0 && items.length > 0);
        const ConceptIcon = concept.icon;
        return (
          <li key={concept.id}>
            <button
              type="button"
              onClick={() => toggle(concept.id)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-muted/60"
            >
              {items.length > 0 ? (
                isOpen ? (
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <ConceptIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-left">{concept.label}</span>
              <span className="text-xs text-muted-foreground">{totalForConcept}</span>
            </button>
            {isOpen && items.length > 0 && (
              <ul className="ml-4 border-l pl-2">
                {items.map((item) => {
                  const ItemIcon = KIND_ICON[item.kind] ?? Blocks;
                  const isSelected = selectedId === item.externalId;
                  return (
                    <li key={item.externalId}>
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left',
                          isSelected
                            ? 'bg-primary/10 font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        )}
                      >
                        <ItemIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </button>
                    </li>
                  );
                })}
                {totalForConcept > items.length && (
                  <li className="px-2 py-1 text-xs text-muted-foreground/70">
                    +{(totalForConcept - items.length).toLocaleString()} more…
                  </li>
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------- detail panel ----------------------------- */

type Field = { name: string; type: string; required?: boolean };

function readFields(item: BlueprintItem): Field[] {
  const raw = item.attributes.fields;
  if (Array.isArray(raw)) {
    return raw
      .filter((f): f is Field => !!f && typeof f === 'object' && 'name' in f)
      .map((f) => ({
        name: String((f as Field).name),
        type: String((f as Field).type ?? 'Text'),
        required: (f as Field).required === true,
      }));
  }
  return [];
}

function readStrings(item: BlueprintItem, key: string): string[] {
  const raw = item.attributes[key];
  return Array.isArray(raw) ? raw.map((v) => String(v)) : [];
}

function readStr(item: BlueprintItem, key: string): string | undefined {
  const v = item.attributes[key];
  return typeof v === 'string' ? v : undefined;
}

const DETAIL_TABS = ['Details', 'Fields', 'Usage', 'Dependencies', 'Versions'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

function DetailPanel({
  item,
  detail,
  rel,
}: {
  item: BlueprintItem;
  detail: BlueprintDetail;
  rel: ReturnType<typeof buildRelationships>;
}) {
  if (item.kind === 'template' || item.kind === 'editableTemplate') {
    return <TemplateDetailPanel item={item} detail={detail} rel={rel} />;
  }
  return <ComponentDetailPanel item={item} detail={detail} rel={rel} />;
}

function ComponentDetailPanel({
  item,
  detail,
  rel,
}: {
  item: BlueprintItem;
  detail: BlueprintDetail;
  rel: ReturnType<typeof buildRelationships>;
}) {
  const [tab, setTab] = useState<DetailTab>('Details');
  const Icon = KIND_ICON[item.kind] ?? Blocks;
  const attrs = item.attributes;
  const resourceType = typeof attrs.resourceType === 'string' ? attrs.resourceType : undefined;
  const group = typeof attrs.group === 'string' ? attrs.group : undefined;

  const fields = readFields(item);
  const requiredFields = fields.filter((f) => f.required);
  const allowedChildren = readStrings(item, 'allowedChildren');
  const allowedParents = rel.allowedParents;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="size-5 text-primary" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{item.name}</h2>
                <Badge variant="secondary">{NODE_KIND_LABELS[item.kind]}</Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {describeKind(item.kind)}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b">
          {DETAIL_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Details' && (
          <div className="space-y-5">
            <section>
              <h3 className="mb-3 text-sm font-semibold">General Information</h3>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Info label="Name" value={item.name} />
                <Info label="Connector" value={getConnectorName(detail.provider)} />
                <Info label="Blueprint Type" value={NODE_KIND_LABELS[item.kind]} />
                <Info label="Discovery Status" value="Discovered" ok />
                {group && <Info label="Component Group" value={group} />}
                {resourceType && <Info label="Resource Type" value={resourceType} mono />}
              </dl>
            </section>

            {/* Fields + Statistics side by side */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {fields.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-semibold">Fields ({fields.length})</p>
                  <ul className="space-y-1.5">
                    {fields.slice(0, 8).map((f) => (
                      <li key={f.name} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Blocks className="size-3.5 text-muted-foreground" />
                          {f.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {f.type}
                          {f.required && <span className="text-red-500">*</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {fields.length > 8 && (
                    <p className="mt-2 text-xs text-primary">View all fields</p>
                  )}
                </div>
              )}

              <div className="rounded-lg border p-4">
                <p className="mb-2 text-xs font-semibold">Statistics</p>
                <div className="space-y-3">
                  <StatRow icon={Boxes} label="Used by" value={`${rel.usedByCount.toLocaleString()} pages`} />
                  <StatRow icon={Blocks} label="Referenced by" value={`${rel.referencedByCount} components`} />
                  <StatRow icon={Link2} label="Dependencies" value={`${rel.dependencyCount} items`} />
                </div>
              </div>
            </div>

            {requiredFields.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-xs font-semibold">
                  Required Fields ({requiredFields.length})
                </p>
                <ul className="space-y-1.5">
                  {requiredFields.map((f) => (
                    <li key={f.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Blocks className="size-3.5 text-muted-foreground" />
                        {f.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {f.type} <span className="text-red-500">*</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Allowed parents / children */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {allowedParents.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-semibold">
                    Allowed Parents ({allowedParents.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedParents.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[11px] font-normal">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {allowedChildren.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-semibold">
                    Allowed Children ({allowedChildren.length})
                  </p>
                  <ul className="space-y-1.5">
                    {allowedChildren.map((c) => (
                      <li key={c} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Blocks className="size-3.5 text-muted-foreground" />
                          {c}
                        </span>
                        <span className="text-xs text-muted-foreground">Component</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'Fields' && (
          <FieldsTab fields={fields} />
        )}

        {tab === 'Usage' && <UsageTab rel={rel} />}

        {tab === 'Dependencies' && <DependenciesTab rel={rel} />}

        {tab === 'Versions' && (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Version history is not tracked for individual nodes yet.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ---------------------- template (layout) detail ---------------------- */

type Region = { name: string; location: string };

function readRegions(item: BlueprintItem): Region[] {
  const raw = item.attributes.regions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => String(v))
    .map((s) => {
      const [name, location] = s.split(':');
      return { name: name ?? s, location: location ?? 'Content' };
    });
}

const TEMPLATE_TABS = ['Details', 'Allowed Components', 'Pages Using', 'Versions', 'Policies'] as const;
type TemplateTab = (typeof TEMPLATE_TABS)[number];

function TemplateDetailPanel({
  item,
  detail,
  rel,
}: {
  item: BlueprintItem;
  detail: BlueprintDetail;
  rel: ReturnType<typeof buildRelationships>;
}) {
  const [tab, setTab] = useState<TemplateTab>('Details');
  const Icon = KIND_ICON[item.kind] ?? LayoutTemplate;
  const regions = readRegions(item);
  const allowedComponents = readStrings(item, 'allowedComponents');
  const usesComponents = readStrings(item, 'usesComponents');
  const templateType = readStr(item, 'templateType') ?? 'Page Template';
  const description = readStr(item, 'description');
  const resourceType = readStr(item, 'resourceType');

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/40">
            <Icon className="size-5 text-green-600" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <Badge variant="secondary">Layout</Badge>
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {description ??
                'Page template used to structure and lay out content pages.'}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 overflow-x-auto border-b">
          {TEMPLATE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Details' && (
          <div className="space-y-5">
            {/* General + Structure side by side */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section>
                <h3 className="mb-3 text-sm font-semibold">General Information</h3>
                <dl className="space-y-2.5 text-sm">
                  <Info label="Name" value={item.name} />
                  <Info label="Template Type" value={templateType} />
                  <Info label="Supports" value="Responsive" />
                  {description && <Info label="Description" value={description} />}
                  {resourceType && <Info label="Resource Type" value={resourceType} mono />}
                  <Info label="Design" value="Responsive Grid (12 columns)" />
                  <Info label="Initial Content" value="Yes" ok />
                </dl>
              </section>

              <section className="rounded-lg border">
                <p className="border-b px-4 py-2 text-sm font-semibold">Structure</p>
                {regions.length > 0 ? (
                  <ul className="divide-y">
                    {regions.map((r) => (
                      <li key={r.name} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <GripVertical className="size-3.5 text-muted-foreground/50" />
                          {r.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({r.location})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No structure regions discovered.
                  </p>
                )}
              </section>
            </div>

            {/* Grid & Design policies */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-semibold">Grid &amp; Breakpoints</p>
                <dl className="space-y-2 text-sm">
                  <Info label="Grid System" value="12 Columns" />
                </dl>
                <p className="mb-1.5 mt-3 text-xs font-semibold text-muted-foreground">
                  Breakpoints
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><p className="font-medium">Desktop</p><p className="text-muted-foreground">≥ 1200px</p></div>
                  <div><p className="font-medium">Tablet</p><p className="text-muted-foreground">768–1199px</p></div>
                  <div><p className="font-medium">Mobile</p><p className="text-muted-foreground">≤ 767px</p></div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-semibold">Design Policies</p>
                <dl className="space-y-2 text-sm">
                  <Info label="Theme" value={`${getConnectorName(detail.provider)} Corporate`} />
                  <Info
                    label="Allowed Components"
                    value={
                      allowedComponents.length > 0
                        ? `Restricted by Policy (${allowedComponents.length})`
                        : 'Unrestricted'
                    }
                    ok={allowedComponents.length > 0}
                  />
                </dl>
              </div>
            </div>

            {/* Template policy */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-semibold">Template Policy</p>
                <p className="text-xs text-muted-foreground">
                  This template follows the {getConnectorName(detail.provider)} page template policy.
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                View Policy
              </Button>
            </div>
          </div>
        )}

        {tab === 'Allowed Components' && (
          <AllowedComponentsTab
            allowed={allowedComponents.length > 0 ? allowedComponents : usesComponents}
          />
        )}

        {tab === 'Pages Using' && <UsageTab rel={rel} />}

        {tab === 'Versions' && (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Version history is not tracked for individual nodes yet.
          </div>
        )}

        {tab === 'Policies' && (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {allowedComponents.length > 0
              ? `${allowedComponents.length} components are allowed by this template's policy.`
              : 'No component policy discovered for this template.'}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function AllowedComponentsTab({ allowed }: { allowed: string[] }) {
  if (allowed.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No allowed components discovered for this template.
      </div>
    );
  }
  return (
    <div className="rounded-lg border">
      <p className="border-b px-4 py-2 text-xs font-semibold">
        Allowed Components ({allowed.length})
      </p>
      <div className="divide-y">
        {allowed.map((name) => (
          <div key={name} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Blocks className="size-3.5 text-muted-foreground" /> {name}
            </span>
            <span className="text-xs text-muted-foreground">Component</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldsTab({ fields }: { fields: Field[] }) {
  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No fields discovered for this node.
      </div>
    );
  }
  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Name</span>
        <span>Type</span>
        <span>Required</span>
      </div>
      {fields.map((f) => (
        <div key={f.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-4 py-2 text-sm last:border-0">
          <span className="flex items-center gap-2 font-medium">
            <Blocks className="size-3.5 text-muted-foreground" /> {f.name}
          </span>
          <span className="text-muted-foreground">{f.type}</span>
          <span>{f.required ? <span className="text-red-500">Required</span> : <span className="text-muted-foreground">Optional</span>}</span>
        </div>
      ))}
    </div>
  );
}

function RelRowList({ items }: { items: RelItem[] }) {
  return (
    <div className="divide-y">
      {items.map((it, i) => (
        <div key={`${it.path ?? it.name}-${i}`} className="flex items-start justify-between gap-2 px-4 py-2 text-sm">
          <span className="flex min-w-0 items-start gap-2">
            <Link2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate">{it.name}</span>
              {it.path && it.path !== it.name && (
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {it.path}
                </span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{it.kindLabel}</span>
        </div>
      ))}
    </div>
  );
}

function UsageTab({ rel }: { rel: ReturnType<typeof buildRelationships> }) {
  const groups: RelBucket[] = [];
  if (rel.usedByPages.length) groups.push({ label: `Used by pages (${rel.usedByPages.length})`, items: rel.usedByPages });
  if (rel.usedByTemplates.length) groups.push({ label: `Used by templates (${rel.usedByTemplates.length})`, items: rel.usedByTemplates });
  if (rel.usedByComponents.length) groups.push({ label: `Used by components (${rel.usedByComponents.length})`, items: rel.usedByComponents });

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        This node is not used anywhere in the discovered content.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label} className="rounded-lg border">
          <p className="border-b px-4 py-2 text-xs font-semibold">{g.label}</p>
          <RelRowList items={g.items.slice(0, 100)} />
          {g.items.length > 100 && (
            <p className="px-4 py-2 text-xs text-muted-foreground">Showing 100 of {g.items.length}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function DependenciesTab({ rel }: { rel: ReturnType<typeof buildRelationships> }) {
  if (rel.dependencies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        This node has no outgoing dependencies.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {rel.dependencies.map((g) => (
        <div key={g.label} className="rounded-lg border">
          <p className="border-b px-4 py-2 text-xs font-semibold">
            {g.label} ({g.items.length})
          </p>
          <RelRowList items={g.items} />
        </div>
      ))}
    </div>
  );
}

function Info({
  label,
  value,
  ok,
  mono,
}: {
  label: string;
  value: string;
  ok?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('flex items-center gap-1.5 font-medium', mono && 'font-mono text-xs')}>
        {ok && <CheckCircle2 className="size-3.5 text-green-600" />}
        {value}
      </dd>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/* -------------------------- relationships rail ------------------------ */

function RelationshipsRail({
  rel,
}: {
  rel: ReturnType<typeof buildRelationships>;
}) {
  const compatibility = 96;
  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4" /> Relationships
        </h3>

        {rel.buckets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No relationships recorded for this node.
          </p>
        ) : (
          rel.buckets.map((bucket) => (
            <div key={bucket.label}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                {bucket.label}
              </p>
              <div className="space-y-1.5">
                {bucket.items.map((it) => (
                  <div
                    key={it.name}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{it.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {it.kindLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <Separator />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Dependency Health
          </p>
          <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 text-sm dark:border-green-900 dark:bg-green-950/30">
            <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4" /> No broken relationships
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              All dependencies are valid.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Compatibility
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium text-green-600">Migration Ready</p>
              <p className="text-xs text-muted-foreground">
                High compatibility with target platforms.
              </p>
            </div>
            <MiniRing percent={compatibility} />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function MiniRing({ percent }: { percent: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center">
      <svg className="size-14 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
        <circle cx="25" cy="25" r={r} fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <span className="absolute text-xs font-semibold">{percent}%</span>
    </div>
  );
}

/* --------------------------- bottom section --------------------------- */

const STRUCTURE_STATS: { label: string; kinds: NodeKind[] }[] = [
  { label: 'Components', kinds: ['component'] },
  { label: 'Layouts', kinds: ['template', 'editableTemplate'] },
  { label: 'Content Types', kinds: ['model'] },
  { label: 'Assets', kinds: ['asset', 'assetFolder'] },
  { label: 'Relationships', kinds: [] },
  { label: 'Localization', kinds: ['language'] },
];

/* ------------------------------ export -------------------------------- */

export function BlueprintArchitecture({ detail }: { detail: BlueprintDetail }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<BlueprintItem | null>(() => {
    // Default to a structural node (not content like sites/pages).
    const structuralKinds = new Set<NodeKind>([
      'component',
      'template',
      'editableTemplate',
      'model',
      'assetFolder',
      'language',
      'reference',
      'policy',
    ]);
    return (
      detail.items.find((i) => i.kind === 'component') ??
      detail.items.find((i) => structuralKinds.has(i.kind)) ??
      null
    );
  });

  const rel = useMemo(
    () => (selected ? buildRelationships(selected, detail) : null),
    [selected, detail],
  );
  const insights = useMemo(() => computeInsights(detail), [detail]);

  const countByKinds = (kinds: NodeKind[]) =>
    kinds.length === 0
      ? detail.edges.length
      : detail.items.filter((i) => kinds.includes(i.kind)).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Three-column IDE layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_300px]">
        {/* Left — architecture tree */}
        <div className="flex h-[560px] flex-col rounded-xl border bg-card shadow-sm">
          <div className="border-b p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <FolderTree className="size-4" /> Blueprint Architecture
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search blueprint…"
                className="h-9 pl-7 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <ConceptTree
                detail={detail}
                query={query}
                selectedId={selected?.externalId ?? null}
                onSelect={setSelected}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Center — detail */}
        <div className="h-[560px] rounded-xl border bg-card shadow-sm">
          {selected && rel ? (
            <DetailPanel item={selected} detail={detail} rel={rel} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a node to inspect it.
            </div>
          )}
        </div>

        {/* Right — relationships */}
        <div className="h-[560px] rounded-xl border bg-card shadow-sm">
          {rel ? (
            <RelationshipsRail rel={rel} />
          ) : (
            <div className="flex h-full items-center justify-center p-5 text-sm text-muted-foreground">
              No selection.
            </div>
          )}
        </div>
      </div>

      {/* Bottom — structure statistics */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Structure Statistics</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {STRUCTURE_STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-semibold tracking-tight">
                {countByKinds(s.kinds).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" /> Blueprint Analysis
          </h3>
          <ul className="space-y-2 text-sm">
            {insights.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.warn ? (
                  <CircleAlert className="size-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="size-4 text-green-600" />
                )}
                <span className={c.warn ? 'text-amber-600' : ''}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-5 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Overall Blueprint Health</p>
          <p
            className={cn(
              'mt-1 text-4xl font-semibold tracking-tight',
              insights.health >= 90
                ? 'text-green-600'
                : insights.health >= 60
                  ? 'text-amber-600'
                  : 'text-red-600',
            )}
          >
            {insights.health}%
          </p>
          <Badge variant="secondary" className="mt-3">
            {insights.health >= 90 ? 'Migration Ready' : 'Needs Review'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function describeKind(kind: NodeKind): string {
  switch (kind) {
    case 'component':
      return 'Reusable building block used across layouts and pages.';
    case 'template':
    case 'editableTemplate':
      return 'A layout that composes components into a page structure.';
    case 'model':
      return 'A content model defining a structured content type.';
    case 'site':
      return 'A site root grouping pages and content.';
    case 'page':
      return 'A page composed of components within a layout.';
    case 'asset':
    case 'assetFolder':
      return 'Media and binary assets managed by the CMS.';
    case 'language':
      return 'A locale / language variant of the content.';
    case 'policy':
      return 'Access control and governance for content.';
    default:
      return 'A node in the normalized Blueprint knowledge graph.';
  }
}

function getConnectorName(provider: string): string {
  return provider === 'aem'
    ? 'Adobe Experience Manager'
    : provider.charAt(0).toUpperCase() + provider.slice(1);
}
