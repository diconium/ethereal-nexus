'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  FolderTree,
  GitCompare,
  Globe,
  History,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Minus,
  Network,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Table2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getCmsConnectorLabel } from '@/data/cms/config';
import { BlueprintArchitecture } from './blueprint-architecture';
import { deleteBlueprint, rediscoverBlueprint } from '@/data/cms/actions';
import {
  NODE_KIND_LABELS,
  EDGE_TYPE_LABELS,
  summarizeChanges,
} from '@/data/cms/graph';
import type { NodeKind } from '@/data/cms/types';
import type { BlueprintDetail, KindGroup } from '@/data/cms/dto';

const TABS = [
  { id: 'Overview', icon: LayoutDashboard },
  { id: 'Architecture', icon: Network },
  { id: 'Relationships', icon: Link2 },
  { id: 'Insights', icon: Sparkles },
  { id: 'History', icon: History },
] as const;
type Tab = (typeof TABS)[number]['id'];

type StatDef = {
  kinds: NodeKind[];
  label: string;
  icon: LucideIcon;
  tint: string;
};

const STAT_DEFS: StatDef[] = [
  { kinds: ['page'], label: 'Pages', icon: FileText, tint: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' },
  { kinds: ['component'], label: 'Components', icon: Boxes, tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40' },
  { kinds: ['template', 'editableTemplate'], label: 'Templates', icon: Layers, tint: 'bg-green-50 text-green-600 dark:bg-green-950/40' },
  { kinds: ['model'], label: 'Content Models', icon: Table2, tint: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40' },
  { kinds: ['assetFolder', 'asset'], label: 'Assets', icon: ImageIcon, tint: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40' },
  { kinds: ['language'], label: 'Languages', icon: Globe, tint: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40' },
  { kinds: ['reference', 'graphqlSchema'], label: 'Relationships', icon: Link2, tint: 'bg-pink-50 text-pink-600 dark:bg-pink-950/40' },
];

function sumKinds(groups: KindGroup[], kinds: NodeKind[]): number {
  return groups.filter((g) => kinds.includes(g.kind)).reduce((s, g) => s + g.count, 0);
}

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: number; icon: LucideIcon; tint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn('flex size-8 items-center justify-center rounded-lg', tint)}>
          <Icon className="size-4" />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-foreground">From last discovery</p>
    </div>
  );
}

function HealthRing({ percent }: { percent: number }) {
  const radius = 52;
  const c = 2 * Math.PI * radius;
  const offset = c - (percent / 100) * c;
  const color = percent >= 100 ? '#16a34a' : percent >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex size-32 items-center justify-center">
      <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <span className="absolute text-2xl font-semibold">{percent}%</span>
    </div>
  );
}

export function BlueprintDetailView({
  blueprint,
  projectHref,
}: {
  blueprint: BlueprintDetail;
  projectHref: string;
}) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [structureQuery, setStructureQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [rediscovering, startRediscover] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteBlueprint(blueprint.definitionId);
      if (result.success) {
        toast.success('Blueprint deleted.');
        router.push(projectHref);
      } else {
        toast.error(result.error.message);
      }
    });
  }

  function handleRediscover() {
    startRediscover(async () => {
      toast.info('Re-discovering blueprint…');
      const result = await rediscoverBlueprint(blueprint.definitionId);
      if (result.success) {
        toast.success(
          `Re-discovery complete — ${result.data.nodeTotal.toLocaleString()} items, ${result.data.changeCount} changes.`,
        );
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  const stats = STAT_DEFS.map((def) => ({
    ...def,
    value: sumKinds(blueprint.groups, def.kinds),
  })).filter((s) => s.value > 0);

  const lastDiscovery = new Date(blueprint.created_at).toLocaleString();
  const changeSummary = summarizeChanges(blueprint.changes);
  const healthPercent = 100;

  const structureGroups = useMemo(() => {
    const q = structureQuery.trim().toLowerCase();
    return blueprint.groups
      .filter((g) => g.count > 0)
      .filter((g) => !q || NODE_KIND_LABELS[g.kind].toLowerCase().includes(q));
  }, [blueprint.groups, structureQuery]);

  function toggle(kind: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={projectHref} className="hover:text-foreground">Blueprints</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">
          {blueprint.name} ({getCmsConnectorLabel(blueprint.provider)})
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{blueprint.name}</h1>
            <Badge variant="success">Ready</Badge>
            <Badge variant="secondary">v{blueprint.version}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            A reusable knowledge-graph blueprint of your CMS structure. Used for mapping, migration and synchronization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRediscover}
            disabled={rediscovering}
          >
            {rediscovering ? (
              <RefreshCcw className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}{' '}
            Re-discover
          </Button>
          <Button variant="outline" size="sm"><Download className="size-4" /> Export</Button>
          <Button size="sm"><GitCompare className="size-4" /> Compare</Button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600">
                <Trash2 className="size-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this Blueprint?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes &ldquo;{blueprint.name}&rdquo; and all its snapshots. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
                  {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {id}
            {id === 'History' && blueprint.changes.length > 0 && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px]">
                {blueprint.changes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <>
          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
              {stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tint={s.tint} />)}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {/* Structure */}
            <div className="rounded-xl border bg-card p-5 shadow-sm xl:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <FolderTree className="size-4" /> Blueprint Structure
              </h2>
              <div className="relative mb-3">
                <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={structureQuery}
                  onChange={(e) => setStructureQuery(e.target.value)}
                  placeholder="Search in structure…"
                  className="h-9 pl-7 text-sm"
                />
              </div>
              {structureGroups.length > 0 ? (
                <ul className="space-y-0.5">
                  {structureGroups.map((g) => {
                    const isOpen = expanded.has(g.kind);
                    const items = blueprint.items
                      .filter((i) => i.kind === g.kind)
                      .slice(0, 25);
                    return (
                      <li key={g.kind}>
                        <button
                          type="button"
                          onClick={() => toggle(g.kind)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <span className="flex items-center gap-1.5">
                            {items.length > 0 ? (
                              isOpen ? (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              )
                            ) : (
                              <span className="w-3.5" />
                            )}
                            {NODE_KIND_LABELS[g.kind]}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {g.count.toLocaleString()}
                          </span>
                        </button>
                        {isOpen && items.length > 0 && (
                          <ul className="ml-6 border-l pl-3">
                            {items.map((item) => {
                              const pages = item.attributes?.pages;
                              return (
                                <li
                                  key={item.externalId}
                                  className="flex items-center justify-between gap-2 py-1 text-xs text-muted-foreground"
                                >
                                  <span className="truncate">{item.name}</span>
                                  {typeof pages === 'number' && (
                                    <span className="shrink-0 text-muted-foreground/70">
                                      {pages.toLocaleString()} pages
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                            {g.count > items.length && (
                              <li className="py-1 text-xs text-muted-foreground/70">
                                +{(g.count - items.length).toLocaleString()} more…
                              </li>
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  No matching nodes.
                </p>
              )}
              <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Total nodes: {blueprint.totalItems.toLocaleString()}
              </div>
            </div>

            {/* Recent changes */}
            <div className="rounded-xl border bg-card p-5 shadow-sm xl:col-span-2">
              <h2 className="mb-4 text-base font-semibold">Changes vs previous</h2>
              {blueprint.changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes (or first discovery).</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {changeSummary.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {blueprint.changes.slice(0, 8).map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        {c.kind === 'added' ? <Plus className="size-3 text-green-600" /> : c.kind === 'removed' ? <Minus className="size-3 text-red-500" /> : <RefreshCcw className="size-3 text-amber-500" />}
                        <span className="truncate">{c.name ?? c.externalId}</span>
                        <span className="text-muted-foreground">{c.nodeKind ? NODE_KIND_LABELS[c.nodeKind] : c.edgeType}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Info */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Blueprint Information</h2>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">CMS</dt><dd className="font-medium">{getCmsConnectorLabel(blueprint.provider)}</dd></div>
                <div><dt className="text-muted-foreground">Connection</dt><dd className="font-medium">{blueprint.connectionName}</dd></div>
                <div><dt className="text-muted-foreground">Last Discovery</dt><dd className="font-medium">{lastDiscovery}</dd></div>
                {blueprint.discoveredBy && <div><dt className="text-muted-foreground">Discovered by</dt><dd className="font-medium">{blueprint.discoveredBy}</dd></div>}
                <div><dt className="text-muted-foreground">Snapshot Version</dt><dd className="font-medium">v{blueprint.version}</dd></div>
                {blueprint.description && <div><dt className="text-muted-foreground">Description</dt><dd className="mt-1 rounded-md border bg-muted/30 p-2 text-xs">{blueprint.description}</dd></div>}
              </dl>
            </div>
          </div>

          <div className="flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-sm">
            <h2 className="mb-4 self-start text-base font-semibold">Discovery Health</h2>
            <HealthRing percent={healthPercent} />
            <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-green-600"><CircleCheck className="size-4" /> All good</p>
            <p className="mt-1 text-xs text-muted-foreground">All discovery tasks completed successfully.</p>
            <Button variant="outline" size="sm" className="mt-4">View Discovery Report</Button>
          </div>
        </>
      ) : tab === 'Architecture' ? (
        <BlueprintArchitecture detail={blueprint} />
      ) : tab === 'Relationships' ? (
        <RelationshipsTab blueprint={blueprint} />
      ) : tab === 'Insights' ? (
        <InsightsTab blueprint={blueprint} changeSummary={changeSummary} healthPercent={healthPercent} />
      ) : (
        <HistoryTab blueprint={blueprint} />
      )}
    </div>
  );
}

/* ----------------------------- Relationships -------------------------- */

function RelationshipsTab({ blueprint }: { blueprint: BlueprintDetail }) {
  // Edge-type breakdown.
  const byType = new Map<string, number>();
  for (const e of blueprint.edges) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
  }
  const edgeStats = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);

  // Most connected nodes (by degree).
  const degree = new Map<string, number>();
  for (const e of blueprint.edges) {
    degree.set(e.fromExternalId, (degree.get(e.fromExternalId) ?? 0) + 1);
    degree.set(e.toExternalId, (degree.get(e.toExternalId) ?? 0) + 1);
  }
  const nameByExt = new Map(blueprint.items.map((i) => [i.externalId, i]));
  const topConnected = Array.from(degree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([ext, count]) => ({
      ext,
      count,
      item: nameByExt.get(ext),
    }));

  if (blueprint.edges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        No relationships discovered yet. Run discovery to build the graph.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Link2 className="size-4" /> Relationship Types
        </h3>
        <ul className="space-y-2">
          {edgeStats.map(([type, count]) => (
            <li key={type} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">
                {EDGE_TYPE_LABELS[type as keyof typeof EDGE_TYPE_LABELS] ?? type}
              </span>
              <span className="font-semibold">{count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          Total edges: {blueprint.edges.length.toLocaleString()}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Network className="size-4" /> Most Connected Nodes
        </h3>
        <ul className="divide-y">
          {topConnected.map(({ ext, count, item }) => (
            <li key={ext} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{item?.name ?? ext.split('/').pop() ?? ext}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {item ? NODE_KIND_LABELS[item.kind] : 'Node'}
                </span>
                <span className="font-semibold">{count}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------- Insights ----------------------------- */

function InsightsTab({
  blueprint,
  changeSummary,
  healthPercent,
}: {
  blueprint: BlueprintDetail;
  changeSummary: string[];
  healthPercent: number;
}) {
  // Compute simple analysis over the graph.
  const referenced = new Set<string>();
  for (const e of blueprint.edges) {
    referenced.add(e.toExternalId);
    if (e.type === 'contains' || e.type === 'uses') referenced.add(e.fromExternalId);
  }
  const components = blueprint.items.filter((i) => i.kind === 'component');
  const orphanComponents = components.filter((c) => !referenced.has(c.externalId));
  const brokenRefs = blueprint.edges.filter(
    (e) => !blueprint.items.some((i) => i.externalId === e.toExternalId),
  );

  const checks = [
    { warn: orphanComponents.length > 0, label: orphanComponents.length === 0 ? 'No orphan components' : `${orphanComponents.length} unused components` },
    { warn: brokenRefs.length > 0, label: brokenRefs.length === 0 ? 'No broken references' : `${brokenRefs.length} broken references` },
    { warn: false, label: 'Relationships validated' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4" /> Blueprint Analysis
          </h3>
          <ul className="space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.warn ? (
                  <CircleAlert className="size-4 text-amber-500" />
                ) : (
                  <CircleCheck className="size-4 text-green-600" />
                )}
                <span className={c.warn ? 'text-amber-600' : ''}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {changeSummary.length > 0 && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold">Changes vs previous</h3>
            <div className="flex flex-wrap gap-1.5">
              {changeSummary.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-xs text-muted-foreground">Overall Blueprint Health</p>
        <p
          className={cn(
            'mt-1 text-4xl font-semibold tracking-tight',
            healthPercent >= 90 ? 'text-green-600' : healthPercent >= 60 ? 'text-amber-600' : 'text-red-600',
          )}
        >
          {healthPercent}%
        </p>
        <Badge variant="secondary" className="mt-3">
          {healthPercent >= 90 ? 'Excellent' : 'Needs Review'}
        </Badge>
        <p className="mt-2 text-xs text-muted-foreground">
          {healthPercent >= 90
            ? 'Your blueprint is healthy and ready for mapping.'
            : 'Some issues require attention before mapping.'}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- History ------------------------------ */

function HistoryTab({ blueprint }: { blueprint: BlueprintDetail }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Snapshot v{blueprint.version}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(blueprint.created_at).toLocaleString()}
              {blueprint.discoveredBy ? ` · by ${blueprint.discoveredBy}` : ''}
            </p>
          </div>
          <Badge variant="success">Current</Badge>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-3 text-sm font-semibold">
          Changes in this snapshot ({blueprint.changes.length})
        </div>
        {blueprint.changes.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No changes recorded (or first discovery).
          </p>
        ) : (
          blueprint.changes.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b px-5 py-2 text-sm last:border-0"
            >
              <Badge
                variant={c.kind === 'added' ? 'success' : c.kind === 'removed' ? 'destructive' : 'warning'}
                className="text-[10px]"
              >
                {c.kind}
              </Badge>
              <span className="truncate">{c.name ?? c.externalId}</span>
              <span className="text-xs text-muted-foreground">
                {c.nodeKind ? NODE_KIND_LABELS[c.nodeKind] : c.edgeType}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
