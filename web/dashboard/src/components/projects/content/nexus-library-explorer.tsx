'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Blocks,
  Boxes,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  LayoutTemplate,
  Library,
  Link2,
  LoaderCircle,
  PieChart,
  Plus,
  Search,
  Sparkles,
  Star,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { seedLibraryFromBlueprint } from '@/data/meta/design/actions';
import { listManifests } from '@/data/cms/manifest';
import type {
  LibraryDefinitionView,
  NexusLibraryView,
} from '@/data/meta/design/dto';
import type { LibraryKind, LibraryStatus } from '@/data/meta/design/types';

const GROUPS: { kind: LibraryKind; label: string; icon: LucideIcon }[] = [
  { kind: 'component', label: 'Components', icon: Boxes },
  { kind: 'contentType', label: 'Content Types', icon: Database },
  { kind: 'layout', label: 'Layouts', icon: LayoutTemplate },
];

const KIND_LABEL: Record<LibraryKind, string> = {
  component: 'Component',
  contentType: 'Content Type',
  layout: 'Layout',
};

const STATUS_META: Record<
  LibraryStatus,
  { label: string; dot: string; badge: 'success' | 'warning' | 'secondary' }
> = {
  canonical: { label: 'Canonical', dot: 'bg-green-500', badge: 'success' },
  generated: { label: 'Generated', dot: 'bg-amber-500', badge: 'warning' },
  review: { label: 'Review', dot: 'bg-blue-500', badge: 'secondary' },
};

/* ------------------------------ stat cards ---------------------------- */

function statusBreakdown(defs: LibraryDefinitionView[]) {
  const b = { canonical: 0, generated: 0, review: 0 };
  for (const d of defs) b[d.status] += 1;
  return b;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={cn('flex size-7 items-center justify-center rounded-lg', tint)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/* ------------------------------ export -------------------------------- */

export function NexusLibraryExplorer({
  library,
  projectId,
  blueprints,
  mappedPercent,
}: {
  library: NexusLibraryView;
  projectId: string;
  blueprints: { definitionId: string; name: string }[];
  env: string | null;
  mappedPercent: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LibraryDefinitionView | null>(
    () =>
      library.definitions.find((d) => d.kind === 'component') ??
      library.definitions[0] ??
      null,
  );
  const [seeding, startSeed] = useTransition();
  const [seedFrom, setSeedFrom] = useState<string>(
    blueprints[0]?.definitionId ?? '',
  );

  const q = query.trim().toLowerCase();

  const defsByKind = (kind: LibraryKind) =>
    library.definitions.filter((d) => d.kind === kind);

  const stats = useMemo(() => {
    const components = defsByKind('component');
    const contentTypes = defsByKind('contentType');
    const layouts = defsByKind('layout');
    const canonical = library.definitions.filter((d) => d.status === 'canonical').length;
    const total = library.definitions.length;
    const adoption = total > 0 ? Math.round((canonical / total) * 100) : 0;
    return {
      components,
      contentTypes,
      layouts,
      cb: statusBreakdown(components),
      ctb: statusBreakdown(contentTypes),
      lb: statusBreakdown(layouts),
      adoption,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.definitions]);

  function handleSeed() {
    if (!seedFrom) {
      toast.error('Select a Blueprint to import from.');
      return;
    }
    startSeed(async () => {
      const result = await seedLibraryFromBlueprint(projectId, seedFrom);
      if (result.success) {
        toast.success(
          `Imported: ${result.data.created} created, ${result.data.updated} updated.`,
        );
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  const isEmpty = library.definitions.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Library className="size-6" /> Nexus Library
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your canonical, CMS-independent content model.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {blueprints.length > 0 && (
            <select
              value={seedFrom}
              onChange={(e) => setSeedFrom(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {blueprints.map((b) => (
                <option key={b.definitionId} value={b.definitionId}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding || blueprints.length === 0}
          >
            {seeding ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}{' '}
            Import from Blueprint
          </Button>
          <Button size="sm" disabled>
            <Plus className="size-4" /> Create
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Components"
          value={stats.components.length.toLocaleString()}
          sub={`Canonical ${stats.cb.canonical} · Generated ${stats.cb.generated} · Review ${stats.cb.review}`}
          icon={Boxes}
          tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40"
        />
        <StatCard
          label="Content Types"
          value={stats.contentTypes.length.toLocaleString()}
          sub={`Canonical ${stats.ctb.canonical} · Generated ${stats.ctb.generated} · Review ${stats.ctb.review}`}
          icon={FileText}
          tint="bg-green-50 text-green-600 dark:bg-green-950/40"
        />
        <StatCard
          label="Layouts"
          value={stats.layouts.length.toLocaleString()}
          sub={`Canonical ${stats.lb.canonical} · Generated ${stats.lb.generated} · Review ${stats.lb.review}`}
          icon={LayoutTemplate}
          tint="bg-blue-50 text-blue-600 dark:bg-blue-950/40"
        />
        <StatCard
          label="Mapped"
          value={`${mappedPercent}%`}
          sub="Blueprint items mapped"
          icon={PieChart}
          tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
        />
        <StatCard
          label="Adoption"
          value={stats.adoption >= 66 ? 'High' : stats.adoption >= 33 ? 'Medium' : 'Low'}
          sub="Canonical maturity"
          icon={Star}
          tint="bg-orange-50 text-orange-600 dark:bg-orange-950/40"
        />
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-12 text-center">
          <Library className="size-10 text-muted-foreground" strokeWidth={1.25} />
          <p className="mt-4 text-sm font-medium">Your Library is empty</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {blueprints.length === 0
              ? 'Discover a Blueprint first, then import your canonical model from it.'
              : 'Import from a Blueprint to create canonical Components, Content Types and Layouts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr_320px]">
          {/* Left — tree */}
          <div className="flex h-[620px] flex-col rounded-xl border bg-card shadow-sm">
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search library…"
                  className="h-9 pl-7 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                <LibraryTree
                  definitions={library.definitions}
                  query={q}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              </div>
            </ScrollArea>
            <div className="flex flex-wrap items-center gap-3 border-t p-3 text-xs text-muted-foreground">
              <Legend dot="bg-green-500" label="Canonical" />
              <Legend dot="bg-amber-500" label="Generated" />
              <Legend dot="bg-blue-500" label="Review" />
            </div>
          </div>

          {/* Center — detail */}
          <div className="h-[620px] rounded-xl border bg-card shadow-sm">
            {selected ? (
              <DefinitionDetail def={selected} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a definition to inspect it.
              </div>
            )}
          </div>

          {/* Right — adoption & mapping */}
          <div className="h-[620px]">
            {selected && <AdoptionRail def={selected} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', dot)} /> {label}
    </span>
  );
}

/* ------------------------------- tree --------------------------------- */

function LibraryTree({
  definitions,
  query,
  selectedId,
  onSelect,
}: {
  definitions: LibraryDefinitionView[];
  query: string;
  selectedId: string | null;
  onSelect: (d: LibraryDefinitionView) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['component']));

  function toggle(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="space-y-1 text-sm">
      {GROUPS.map((g) => {
        const inKind = definitions
          .filter((d) => d.kind === g.kind)
          .filter((d) => !query || d.name.toLowerCase().includes(query));
        if (query && inKind.length === 0) return null;
        const groupOpen = openGroups.has(g.kind) || (query.length > 0 && inKind.length > 0);
        const GroupIcon = g.icon;

        // sub-group by category (`group`)
        const byCategory = new Map<string, LibraryDefinitionView[]>();
        for (const d of inKind) {
          const cat = d.group || 'General';
          if (!byCategory.has(cat)) byCategory.set(cat, []);
          byCategory.get(cat)!.push(d);
        }

        return (
          <li key={g.kind}>
            <button
              type="button"
              onClick={() => toggle(g.kind)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold hover:bg-muted/60"
            >
              {inKind.length > 0 ? (
                groupOpen ? (
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <GroupIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-left">{g.label}</span>
              <span className="text-xs text-muted-foreground">
                {definitions.filter((d) => d.kind === g.kind).length}
              </span>
            </button>

            {groupOpen &&
              Array.from(byCategory.entries()).map(([cat, items]) => {
                const catId = `${g.kind}:${cat}`;
                const catOpen = openGroups.has(catId) || query.length > 0;
                return (
                  <div key={catId} className="ml-4">
                    <button
                      type="button"
                      onClick={() => toggle(catId)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-1.5">
                        {catOpen ? (
                          <ChevronDown className="size-3 shrink-0" />
                        ) : (
                          <ChevronRight className="size-3 shrink-0" />
                        )}
                        {cat}
                      </span>
                      <span>{items.length}</span>
                    </button>
                    {catOpen && (
                      <ul className="ml-3 border-l pl-2">
                        {items.map((d) => {
                          const isSel = selectedId === d.id;
                          const sm = STATUS_META[d.status];
                          return (
                            <li key={d.id}>
                              <button
                                type="button"
                                onClick={() => onSelect(d)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left',
                                  isSel
                                    ? 'bg-primary/10 font-medium text-foreground'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                )}
                              >
                                <span className={cn('size-1.5 shrink-0 rounded-full', sm.dot)} />
                                <span className="flex-1 truncate">{d.name}</span>
                                <span className="shrink-0 text-[10px] capitalize text-muted-foreground">
                                  {d.status}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------- detail panel ---------------------------- */

const DETAIL_TABS = [
  'Overview',
  'Fields',
  'Relationships',
  'Used By',
  'Dependencies',
  'History',
] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

function DefinitionDetail({ def }: { def: LibraryDefinitionView }) {
  const [tab, setTab] = useState<DetailTab>('Overview');
  const sm = STATUS_META[def.status];
  const Icon =
    def.kind === 'layout' ? LayoutTemplate : def.kind === 'contentType' ? Database : Boxes;
  const fieldCount = def.dialog.dialog.length;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-6">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="size-5 text-primary" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{def.name}</h2>
                <Badge variant={sm.badge}>{sm.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {def.description ??
                  `${KIND_LABEL[def.kind]} in the Nexus Library.`}
              </p>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto border-b">
          {DETAIL_TABS.map((t) => {
            const count =
              t === 'Fields' && def.kind !== 'layout' ? fieldCount : undefined;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  tab === t
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
                {count !== undefined && (
                  <span className="ml-1 text-muted-foreground">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {tab === 'Overview' && <OverviewTab def={def} />}
        {tab === 'Fields' && <FieldsTab def={def} />}
        {tab === 'Relationships' && (
          <Placeholder text="Relationships are populated once mapping is configured (Phase 2)." />
        )}
        {tab === 'Used By' && (
          <Placeholder text="Project usage appears once this definition is mapped and provisioned." />
        )}
        {tab === 'Dependencies' && <DependenciesTab def={def} />}
        {tab === 'History' && (
          <Placeholder text="Version history is not tracked for individual definitions yet." />
        )}
      </div>
    </ScrollArea>
  );
}

function OverviewTab({ def }: { def: LibraryDefinitionView }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-lg border p-4">
        <dl className="space-y-2.5 text-sm">
          <Info label="Key" value={def.key} mono />
          <Info label="Kind" value={KIND_LABEL[def.kind]} />
          <Info label="Category" value={def.group ?? 'General'} />
          <Info label="Status" value={STATUS_META[def.status].label} />
          <Info label="Created" value={new Date(def.created_at).toLocaleDateString()} />
          <Info label="Updated" value={new Date(def.updated_at).toLocaleDateString()} />
        </dl>
      </section>
      <section className="rounded-lg border p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Origin</p>
        {def.sourceHint?.externalId ? (
          <dl className="space-y-2.5 text-sm">
            <Info label="Connector" value={(def.sourceHint.cms ?? '').toUpperCase() || '—'} />
            <Info label="Discovered from" value={def.sourceHint.externalId} mono />
            {def.sourceHint.resourceType && (
              <Info label="Resource Type" value={def.sourceHint.resourceType} mono />
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Created directly in Nexus (no source origin).
          </p>
        )}
      </section>
    </div>
  );
}

function FieldsTab({ def }: { def: LibraryDefinitionView }) {
  if (def.kind === 'layout') {
    return <Placeholder text="Layouts define composition (regions), not fields." />;
  }
  const fields = def.dialog.dialog;
  if (fields.length === 0) {
    return <Placeholder text="No fields defined." />;
  }
  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Field</span>
        <span>Type</span>
        <span>Required</span>
      </div>
      {fields.map((f) => (
        <div
          key={f.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-4 py-2 text-sm last:border-0"
        >
          <span className="flex items-center gap-2 font-medium">
            <Blocks className="size-3.5 text-muted-foreground" />
            {f.label || f.name}
          </span>
          <span className="text-xs text-muted-foreground">{f.type}</span>
          <span className="text-xs">
            {f.required ? (
              <span className="text-red-500">Required</span>
            ) : (
              <span className="text-muted-foreground">Optional</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function DependenciesTab({ def }: { def: LibraryDefinitionView }) {
  if (def.kind === 'layout' && def.composition) {
    const { regions, usesComponentKeys } = def.composition;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border">
          <p className="border-b px-4 py-2 text-xs font-semibold">
            Regions ({regions.length})
          </p>
          {regions.length === 0 ? (
            <Placeholder text="No regions." />
          ) : (
            regions.map((r) => (
              <div
                key={r.key}
                className="flex items-center justify-between border-b px-4 py-2 text-sm last:border-0"
              >
                <span>{r.name}</span>
                <span className="text-xs text-muted-foreground">({r.location})</span>
              </div>
            ))
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-xs font-semibold">Uses Components</p>
          {usesComponentKeys.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {usesComponentKeys.map((k) => (
                <Badge key={k} variant="secondary" className="font-normal">
                  {k}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No dependencies.</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <Placeholder text="Dependencies (referenced content types / assets) are derived from the Blueprint graph and mapping." />
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/* ---------------------------- adoption rail --------------------------- */

function AdoptionRail({ def }: { def: LibraryDefinitionView }) {
  const manifests = listManifests();
  return (
    <ScrollArea className="h-full rounded-xl border bg-card shadow-sm">
      <div className="space-y-5 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PieChart className="size-4" /> Adoption & Mapping
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Mapped Blueprints</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Projects using</p>
              <p className="text-lg font-semibold">0</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Open the Mappings workbench to link Blueprint items to this
            definition.
          </p>
        </div>

        <Separator />

        <div>
          <p className="mb-2 text-sm font-semibold">Compatibility</p>
          <ul className="space-y-1.5 text-sm">
            {manifests.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Link2 className="size-3.5 text-muted-foreground" /> {m.name}
                </span>
                <Badge variant={m.available ? 'success' : 'secondary'} className="text-[10px]">
                  {m.available ? 'Native' : 'Planned'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <p className="mb-2 text-sm font-semibold">Metadata</p>
          <p className="text-xs text-muted-foreground">Tags</p>
          {def.tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {def.tags.map((t) => (
                <Badge key={t} variant="secondary" className="font-normal">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No tags.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Default Icon</p>
          <div className="mt-1 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
            <Sparkles className="size-3.5 text-primary" /> {def.key}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
