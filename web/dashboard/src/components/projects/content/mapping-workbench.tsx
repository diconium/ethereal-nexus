'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleOff,
  Copy,
  Database,
  FileText,
  GitCompare,
  GitMerge,
  LayoutTemplate,
  Link2,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  autoMapAll,
  acceptAll,
  setMappingLink,
  skipAll,
  bulkSkip,
  bulkAutoMap,
  bulkAccept,
} from '@/data/meta/mapping/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setMappingTarget } from '@/data/meta/mapping/actions';
import { startMigrationJob } from '@/data/meta/provision/actions';
import { upsertLibraryDefinitionForComponent } from '@/data/meta/design/actions';
import { getCmsConnectorLabel, type CmsConnectorKey } from '@/data/cms/config';
import { cmsLogoByKey, type CmsId } from '@/components/projects/content/cms-logos';
import type { MappingWorkbench, MappingItem } from '@/data/meta/mapping/dto';
import type { MappingStatus } from '@/data/meta/mapping/types';
import type { LibraryDefinitionView } from '@/data/meta/design/dto';

type ProjectComponentWithDialog = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  version: string | null;
  dialog: unknown; // raw Nexus dialog array from component_version
};

const KIND_TABS = [
  { kind: 'component', label: 'Components', icon: Boxes },
  { kind: 'contentType', label: 'Content Types', icon: Database },
  { kind: 'layout', label: 'Layouts', icon: LayoutTemplate },
] as const;

const STATUS_META: Record<
  MappingStatus,
  { label: string; dot: string; badge: 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
  mapped: { label: 'Mapped', dot: 'bg-green-500', badge: 'success' },
  'needs-review': { label: 'Need review', dot: 'bg-amber-500', badge: 'warning' },
  missing: { label: 'Missing', dot: 'bg-red-500', badge: 'destructive' },
  conflict: { label: 'Conflict', dot: 'bg-purple-500', badge: 'secondary' },
  skipped: { label: 'Skipped', dot: 'bg-muted-foreground/40', badge: 'secondary' },
};

const SORT_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'name', label: 'Name' },
  { value: 'confidence', label: 'Confidence' },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]['value'];

const PAGE_SIZE = 10;

/** Renders the connector logo for a provider key, when one is known. */
function ConnectorLogo({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  const Logo = cmsLogoByKey[provider as CmsId];
  if (!Logo) return null;
  return <>{Logo({ className })}</>;
}

/** Small icon per kind for the item row */
function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === 'layout') return <LayoutTemplate className={cn('shrink-0', className)} />;
  if (kind === 'contentType') return <Database className={cn('shrink-0', className)} />;
  return <Boxes className={cn('shrink-0', className)} />;
}

export function MappingWorkbench({
  workbench,
  library,
  connections,
  blueprints,
  projectComponents,
}: {
  workbench: MappingWorkbench;
  library: LibraryDefinitionView[];
  connections: { id: string; name: string; provider: string }[];
  blueprints: { definitionId: string; name: string; provider: string }[];
  projectComponents: ProjectComponentWithDialog[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeKind, setActiveKind] = useState<string>('component');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('status');
  const [page, setPage] = useState(1);
  const [componentFocusKeys, setComponentFocusKeys] = useState<Set<string> | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => workbench.items.find((i) => i.kind === 'component')?.key ?? null,
  );
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [busy, startBusy] = useTransition();
  const [mappingStrategy, setMappingStrategy] = useState<'clone' | 'existing' | 'advanced'>('clone');
  const [remapping, setRemapping] = useState(false);
  // "Map to existing" wizard state
  const [existingStep, setExistingStep] = useState<1 | 2 | 3>(1);
  const [existingQuery, setExistingQuery] = useState('');
  const [existingTypeFilter, setExistingTypeFilter] = useState<string>('all');
  const [existingGroupFilter, setExistingGroupFilter] = useState<string>('all');
  const [existingSelected, setExistingSelected] = useState<string | null>(null);
  const [existingFieldMap, setExistingFieldMap] = useState<Array<{ sourceField: string; targetField: string }>>([]);

  const defsById = useMemo(
    () => new Map(library.map((d) => [d.id, d])),
    [library],
  );

  const kindItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = workbench.items
      .filter((i) => i.kind === activeKind)
      .filter((i) =>
        activeKind !== 'component' || !componentFocusKeys
          ? true
          : componentFocusKeys.has(i.key),
      )
      .filter((i) => statusFilter === 'all' || i.status === statusFilter)
      .filter((i) => !q || i.name.toLowerCase().includes(q));

    // Sort
    items = [...items].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'confidence') return b.confidence - a.confidence;
      // status: mapped first, then needs-review, conflict, missing, skipped
      const order: Record<MappingStatus, number> = {
        mapped: 0, 'needs-review': 1, conflict: 2, missing: 3, skipped: 4,
      };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });

    return items;
  }, [workbench.items, activeKind, componentFocusKeys, statusFilter, query, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(kindItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = kindItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filter/search/kind changes
  const resetPage = () => setPage(1);

  const selected =
    kindItems.find((i) => i.key === selectedKey) ?? kindItems[0] ?? null;
  const selectedIndex = selected
    ? kindItems.findIndex((i) => i.key === selected.key)
    : -1;

  const stats = workbench.stats;

  // Per-status counts for the filter bar
  const statusCounts = useMemo(() => {
    const base = workbench.items.filter((i) => i.kind === activeKind);
    return {
      all: base.length,
      mapped: base.filter((i) => i.status === 'mapped').length,
      'needs-review': base.filter((i) => i.status === 'needs-review').length,
      missing: base.filter((i) => i.status === 'missing').length,
      conflict: base.filter((i) => i.status === 'conflict').length,
    };
  }, [workbench.items, activeKind]);

  function refresh() { router.refresh(); }

  function runAutoMap() {
    startBusy(async () => {
      const r = await autoMapAll(workbench.mapping.id);
      if (r.success) {
        toast.success(`Auto-mapped: ${r.data.needsReview} to review, ${r.data.conflict} conflicts, ${r.data.missing} missing.`);
        refresh();
      } else toast.error(r.error.message);
    });
  }
  function runAcceptAll() {
    startBusy(async () => {
      const r = await acceptAll(workbench.mapping.id);
      if (r.success) { toast.success('All reviewed mappings accepted.'); refresh(); }
      else toast.error(r.error.message);
    });
  }
  function runSkipAll() {
    startBusy(async () => {
      const r = await skipAll(workbench.mapping.id);
      if (r.success) { toast.success('Unmapped items skipped.'); refresh(); }
      else toast.error(r.error.message);
    });
  }
  function selectTarget(connectionId: string | null) {
    startBusy(async () => {
      const r = await setMappingTarget(workbench.mapping.id, connectionId);
      if (r.success) { toast.success('Target updated.'); refresh(); }
      else toast.error(r.error.message);
    });
  }
  function runMigration() {
    startBusy(async () => {
      const r = await startMigrationJob(workbench.mapping.id);
      if (r.success) {
        toast.success('Migration job started.');
        const env = searchParams.get('env');
        const base = pathname.replace(/\/mappings$/, '');
        const qs = env ? `?env=${env}` : '';
        router.push(`${base}/migration-jobs/${r.data.jobId}${qs}`);
      } else {
        toast.error(r.error.message);
      }
    });
  }
  function selectBlueprint(definitionId: string) {
    if (definitionId === workbench.mapping.blueprintDefinitionId) return;
    const params = new URLSearchParams();
    const env = searchParams.get('env');
    if (env) params.set('env', env);
    params.set('blueprint', definitionId);
    router.push(`${pathname}?${params.toString()}`);
  }

  const targetConnection = connections.find(
    (c) => c.id === workbench.mapping.targetConnectionId,
  );
  const sourceKindCount = workbench.items.filter((i) => i.kind === activeKind).length;
  const sourceKindLabel =
    KIND_TABS.find((t) => t.kind === activeKind)?.label.toLowerCase() ?? 'items';
  const itemById = useMemo(
    () => new Map<string, MappingItem>(workbench.items.map((i) => [`${i.kind}:${i.key}`, i])),
    [workbench.items],
  );
  const componentNameByKey = useMemo(
    () => new Map(library.filter((d) => d.kind === 'component').map((d) => [d.key, d.name] as const)),
    [library],
  );

  function setLink(item: MappingItem, patch: Parameters<typeof setMappingLink>[2]) {
    startBusy(async () => {
      const r = await setMappingLink(workbench.mapping.id, { kind: item.kind, key: item.key, name: item.name }, patch);
      if (r.success) refresh();
      else toast.error(r.error.message);
    });
  }

  // Reset wizard when a different item is selected
  function selectItem(key: string) {
    setSelectedKey(key);
    setMappingStrategy('clone');
    setRemapping(false);
    setExistingStep(1);
    setExistingQuery('');
    setExistingSelected(null);
    setExistingFieldMap([]);
  }

  function navigate(delta: number) {
    if (selectedIndex < 0) return;
    const next = kindItems[selectedIndex + delta];
    if (next) setSelectedKey(next.key);
  }

  function reviewRequiredComponents(item: MappingItem) {
    if (item.kind !== 'layout') return;
    const deps = item.dependsOn.map((id) => itemById.get(id)).filter((d): d is MappingItem => !!d && d.kind === 'component');
    if (deps.length === 0) { toast.message('No component dependencies discovered for this layout.'); return; }
    const keys = new Set(deps.map((d) => d.key));
    setComponentFocusKeys(keys);
    setActiveKind('component');
    setStatusFilter('all');
    setQuery('');
    setSelectedKey(deps[0].key);
    resetPage();
  }

  /* ------- bulk selection ------- */
  const idOf = (i: MappingItem) => `${i.kind}:${i.key}`;
  const checkedItems = useMemo(() => workbench.items.filter((i) => checked.has(idOf(i))), [workbench.items, checked]);
  const visibleIds = pagedItems.map(idOf);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => checked.has(id));
  const someVisibleChecked = visibleIds.some((id) => checked.has(id));

  function toggleItem(id: string, on: boolean) {
    setChecked((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });
  }
  function toggleAllVisible(on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) { if (on) next.add(id); else next.delete(id); }
      return next;
    });
  }
  function clearSelection() { setChecked(new Set()); }

  const bulkTargets = () => checkedItems.map((i) => ({ kind: i.kind, key: i.key, name: i.name }));

  function runBulkSkip() {
    const targets = bulkTargets();
    if (targets.length === 0) return;
    startBusy(async () => {
      const r = await bulkSkip(workbench.mapping.id, targets);
      if (r.success) {
        if (r.data.blocked.length > 0) {
          toast.warning(`Skipped ${r.data.skipped}. Blocked: ${r.data.blocked.map((b) => b.name).join(', ')}.`);
        } else { toast.success(`Skipped ${r.data.skipped} item(s).`); }
        clearSelection(); refresh();
      } else toast.error(r.error.message);
    });
  }
  function runBulkAutoMap() {
    const targets = bulkTargets();
    if (targets.length === 0) return;
    startBusy(async () => {
      const r = await bulkAutoMap(workbench.mapping.id, targets);
      if (r.success) { toast.success(`Auto-mapped ${r.data.mapped}, ${r.data.missing} without a match.`); clearSelection(); refresh(); }
      else toast.error(r.error.message);
    });
  }
  function runBulkAccept() {
    const targets = bulkTargets();
    if (targets.length === 0) return;
    startBusy(async () => {
      const r = await bulkAccept(workbench.mapping.id, targets);
      if (r.success) {
        toast.success(r.data.skippedNoTarget > 0 ? `Accepted ${r.data.accepted}. ${r.data.skippedNoTarget} had no target.` : `Accepted ${r.data.accepted} item(s).`);
        clearSelection(); refresh();
      } else toast.error(r.error.message);
    });
  }

  const target = selected?.targetDefinitionId ? defsById.get(selected.targetDefinitionId) : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Mappings</h1>
          <p className="mt-1 text-muted-foreground">
            Map blueprint items to your Nexus Library. Suggestions are based on structure, fields, usage and metadata.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled>
            <Sparkles className="size-4" /> Mapping assistant
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileText className="size-4" /> View mapping report
          </Button>
          <Button
            size="sm"
            onClick={runMigration}
            disabled={busy || !workbench.mapping.targetConnectionId}
            title={workbench.mapping.targetConnectionId ? undefined : 'Select a target connection first'}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <GitCompare className="size-4" />}{' '}
            Generate Provision Plan
          </Button>
        </div>
      </div>

      {/* Header row: health · stats · source→target */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,1.4fr)]">
        {/* Overall Mapping Health */}
        <div className="flex flex-col justify-center rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Overall Mapping Health</p>
          <p className="mt-1 text-3xl font-semibold">{stats.percent}%</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${stats.percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stats.mapped} of {stats.total} items mapped</p>
        </div>

        {/* Status breakdown */}
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-4 shadow-sm [&>*:not(:first-child)]:border-l [&>*:not(:first-child)]:pl-4">
          <MiniStat icon={CheckCircle2} tint="text-green-600" bg="bg-green-100 dark:bg-green-950/40" label="Mapped" value={stats.mapped} total={stats.total} />
          <MiniStat icon={CircleAlert} tint="text-amber-600" bg="bg-amber-100 dark:bg-amber-950/40" label="Need review" value={stats.needsReview} total={stats.total} />
          <MiniStat icon={CircleOff} tint="text-red-500" bg="bg-red-100 dark:bg-red-950/40" label="Missing" value={stats.missing} total={stats.total} />
          <MiniStat icon={GitCompare} tint="text-purple-600" bg="bg-purple-100 dark:bg-purple-950/40" label="Conflicts" value={stats.conflict} total={stats.total} />
        </div>

        {/* source→target */}
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs text-muted-foreground">Source Blueprint</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" disabled={busy || blueprints.length <= 1} className="group flex w-full items-center gap-2.5 rounded-lg text-left outline-none transition disabled:cursor-default disabled:opacity-100">
                  <ConnectorLogo provider={workbench.provider} className="size-9 shrink-0" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold">
                      {workbench.blueprintName}{' '}
                      <span className="font-normal text-muted-foreground">({getCmsConnectorLabel(workbench.provider)})</span>
                      {blueprints.length > 1 ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100" /> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{sourceKindCount} {sourceKindLabel}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-64">
                <DropdownMenuLabel>Source blueprint</DropdownMenuLabel>
                {blueprints.map((b) => (
                  <DropdownMenuItem key={b.definitionId} onSelect={() => selectBlueprint(b.definitionId)} className="gap-2">
                    <ConnectorLogo provider={b.provider} className="size-5 shrink-0" />
                    <span className="flex-1 truncate">{b.name}</span>
                    <span className="text-xs text-muted-foreground">{getCmsConnectorLabel(b.provider as CmsConnectorKey)}</span>
                    {b.definitionId === workbench.mapping.blueprintDefinitionId ? <CheckCircle2 className="size-4 text-green-600" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border">
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs text-muted-foreground">Target</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" disabled={busy} className="group flex items-center gap-2.5 rounded-lg text-left outline-none transition disabled:opacity-60">
                  {targetConnection ? (
                    <ConnectorLogo provider={targetConnection.provider} className="size-9 shrink-0" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                      <Plus className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    {targetConnection ? (
                      <>
                        <p className="flex items-center gap-1 truncate text-sm font-semibold">
                          {targetConnection.name}
                          <ChevronDown className="size-3.5 text-muted-foreground opacity-60 transition group-hover:opacity-100" />
                        </p>
                        <Badge variant="secondary" className="mt-0.5 text-[10px] font-normal">Nexus Library</Badge>
                      </>
                    ) : (
                      <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        Select target <ChevronDown className="size-3.5" />
                      </p>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuLabel>Target connection</DropdownMenuLabel>
                {connections.length === 0 ? (
                  <DropdownMenuItem disabled>No connections available</DropdownMenuItem>
                ) : (
                  connections.map((c) => (
                    <DropdownMenuItem key={c.id} onSelect={() => selectTarget(c.id)} className="gap-2">
                      <ConnectorLogo provider={c.provider} className="size-5 shrink-0" />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{getCmsConnectorLabel(c.provider as CmsConnectorKey)}</span>
                    </DropdownMenuItem>
                  ))
                )}
                {targetConnection ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => selectTarget(null)}>
                      <CircleOff className="size-4" /> Clear target
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs + action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b">
        <div className="flex gap-1">
          {KIND_TABS.map(({ kind, label, icon: Icon }) => {
            const count = workbench.items.filter((i) => i.kind === kind).length;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setActiveKind(kind);
                  if (kind !== 'component') setComponentFocusKeys(null);
                  setSelectedKey(null);
                  setStatusFilter('all');
                  setQuery('');
                  resetPage();
                }}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  activeKind === kind
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" /> {label}
                <span className="text-xs text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Button variant="outline" size="sm" onClick={runAcceptAll} disabled={busy}>Accept all</Button>
          <Button variant="outline" size="sm" onClick={runSkipAll} disabled={busy}>Skip all</Button>
          <Button size="sm" onClick={runAutoMap} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{' '}
            Auto-map
          </Button>
        </div>
      </div>

      {/* Three-pane body */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr_320px]">

        {/* ── Left — source tree ── */}
        <div className="flex flex-col rounded-xl border bg-card shadow-sm">
          {/* Panel header */}
          <div className="space-y-2 border-b p-3">
            <div>
              <p className="text-sm font-semibold">Source Blueprint</p>
              <p className="truncate text-xs text-muted-foreground">{workbench.blueprintName}</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); resetPage(); }}
                placeholder={`Search ${activeKind === 'component' ? 'components' : activeKind === 'contentType' ? 'content types' : 'layouts'}…`}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              {(
                [
                  { value: 'all', label: `All ${statusCounts.all}`, dot: null },
                  { value: 'mapped', label: 'Mapped', dot: 'bg-green-500' },
                  { value: 'needs-review', label: 'Review', dot: 'bg-amber-500' },
                  { value: 'missing', label: 'Missing', dot: 'bg-red-500' },
                  { value: 'conflict', label: 'Conflict', dot: 'bg-purple-500' },
                ] as const
              ).map(({ value, label, dot }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setStatusFilter(value); resetPage(); }}
                  className={cn(
                    'flex shrink-0 items-center gap-1 whitespace-nowrap transition-colors',
                    statusFilter === value
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus banner */}
          {activeKind === 'component' && componentFocusKeys ? (
            <div className="flex items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/20">
              <span>Required components for layout ({componentFocusKeys.size})</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setComponentFocusKeys(null); resetPage(); }}>
                Show all
              </Button>
            </div>
          ) : null}

          {/* Select all + Sort row */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Checkbox
              checked={allVisibleChecked ? true : someVisibleChecked ? 'indeterminate' : false}
              onCheckedChange={(v) => toggleAllVisible(v === true)}
              aria-label="Select all visible"
            />
            <span className="flex-1 text-xs text-muted-foreground">
              {someVisibleChecked
                ? `${visibleIds.filter((id) => checked.has(id)).length} selected`
                : `Select all ${kindItems.length}`}
            </span>
            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Sort: {SORT_OPTIONS.find((s) => s.value === sort)?.label}
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-32">
                {SORT_OPTIONS.map((o) => (
                  <DropdownMenuItem key={o.value} onSelect={() => setSort(o.value)} className={cn(sort === o.value && 'font-semibold')}>
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto">
            {pagedItems.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No items.</p>
            ) : (
              <ul className="divide-y">
                {pagedItems.map((item) => {
                  const sm = STATUS_META[item.status];
                  const isSel = selected?.key === item.key;
                  const id = `${item.kind}:${item.key}`;
                  const isChecked = checked.has(id);
                  // Resolve target name for the status label
                  const targetDef = item.targetDefinitionId ? defsById.get(item.targetDefinitionId) : undefined;
                  const targetName = targetDef?.name;

                  return (
                    <li
                      key={id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 transition-colors',
                        isSel ? 'bg-primary/8' : 'hover:bg-muted/40',
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => toggleItem(id, v === true)}
                        aria-label={`Select ${item.name}`}
                        className="shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => selectItem(item.key)}
                        className="flex flex-1 items-center gap-2.5 overflow-hidden text-left"
                      >
                        {/* Kind icon with coloured background */}
                        <span className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-md',
                          isSel ? 'bg-primary/15' : 'bg-muted',
                        )}>
                          <KindIcon kind={item.kind} className="size-3.5 text-foreground/70" />
                        </span>

                        {/* Name + status */}
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-sm', isSel ? 'font-semibold text-foreground' : 'text-foreground/90')}>
                            {item.name}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span className={cn('size-1.5 shrink-0 rounded-full', sm.dot)} />
                            <span className={cn(
                              item.status === 'mapped' ? 'text-green-600' :
                              item.status === 'needs-review' ? 'text-amber-600' :
                              item.status === 'missing' ? 'text-red-500' :
                              item.status === 'conflict' ? 'text-purple-600' : 'text-muted-foreground'
                            )}>
                              {sm.label}
                            </span>
                            {targetName && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <span className="truncate text-muted-foreground">{targetName}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Confidence badge */}
                        {item.confidence > 0 ? (
                          <span className={cn(
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                            item.confidence >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                            item.confidence >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                            'bg-muted text-muted-foreground',
                          )}>
                            {item.confidence}%
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] text-muted-foreground">—</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Bulk action bar */}
          {checkedItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t bg-muted/30 p-2">
              <span className="px-1 text-xs font-medium">{checkedItems.length} selected</span>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={runBulkAutoMap} disabled={busy}>
                <Sparkles className="size-3.5" /> Auto-map
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={runBulkAccept} disabled={busy}>
                Accept
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={runBulkSkip} disabled={busy}>
                <CircleOff className="size-3.5" /> Skip
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={clearSelection} disabled={busy}>
                Clear
              </Button>
            </div>
          ) : null}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, kindItems.length)} of {kindItems.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="flex size-6 items-center justify-center rounded border text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                {/* Page numbers — show at most 5 */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (safePage <= 3) p = i + 1;
                  else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = safePage - 2 + i;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={cn(
                        'flex size-6 items-center justify-center rounded text-xs transition',
                        p === safePage
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && safePage < totalPages - 2 ? (
                  <span className="text-xs text-muted-foreground">…</span>
                ) : null}
                {totalPages > 5 && safePage < totalPages - 2 ? (
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="flex size-6 items-center justify-center rounded border text-xs text-muted-foreground hover:text-foreground"
                  >
                    {totalPages}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="flex size-6 items-center justify-center rounded border text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}


        </div>

        {/* ── Center — mapping ── */}
        <div className="h-[700px] rounded-xl border bg-card shadow-sm">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="space-y-5 p-5">
                {/* item header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {selected.kind === 'layout' ? (
                      <LayoutTemplate className="size-5 text-primary" />
                    ) : selected.kind === 'contentType' ? (
                      <Database className="size-5 text-primary" />
                    ) : (
                      <Boxes className="size-5 text-primary" />
                    )}
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    <Badge variant={STATUS_META[selected.status].badge}>
                      {STATUS_META[selected.status].label}
                    </Badge>
                    {selected.confidence > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 text-amber-500" />
                        {selected.confidence}% confidence
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate(-1)} disabled={selectedIndex <= 0}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedIndex + 1} of {kindItems.length}
                    </span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate(1)} disabled={selectedIndex >= kindItems.length - 1}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Mapping strategy */}
                {selected.status === 'mapped' && !remapping && (
                  <MappedSummary
                    item={selected}
                    target={target}
                    onRemap={() => setRemapping(true)}
                    onSkip={() => setLink(selected, { status: 'skipped' })}
                    busy={busy}
                  />
                )}
                {(selected.status !== 'mapped' || remapping) && (
                <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-3 text-sm font-semibold">Mapping strategy</p>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Clone 1:1 */}
                    <button
                      type="button"
                      onClick={() => setMappingStrategy('clone')}
                      className={cn(
                        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
                        mappingStrategy === 'clone'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/40',
                      )}
                    >
                      <span className={cn(
                        'flex size-9 items-center justify-center rounded-lg',
                        mappingStrategy === 'clone' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        <Copy className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Clone component (1:1)</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Create an identical Nexus component with the same fields and structure.
                        </p>
                      </div>
                      <p className="mt-auto text-xs font-medium text-primary">Recommended for migrations</p>
                    </button>

                    {/* Map to existing */}
                    <button
                      type="button"
                      onClick={() => setMappingStrategy('existing')}
                      className={cn(
                        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
                        mappingStrategy === 'existing'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/40',
                      )}
                    >
                      <span className={cn(
                        'flex size-9 items-center justify-center rounded-lg',
                        mappingStrategy === 'existing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        <Link2 className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Map to existing component</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Map fields to an existing component in your Nexus Library.
                        </p>
                      </div>
                      <p className="mt-auto text-xs font-medium text-primary">Recommended for standardization</p>
                    </button>

                    {/* Advanced */}
                    <button
                      type="button"
                      onClick={() => setMappingStrategy('advanced')}
                      className={cn(
                        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
                        mappingStrategy === 'advanced'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/40',
                      )}
                    >
                      <span className={cn(
                        'flex size-9 items-center justify-center rounded-lg',
                        mappingStrategy === 'advanced' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        <GitMerge className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Advanced mapping</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Split, merge or compose using multiple component or components.
                        </p>
                      </div>
                      <p className="mt-auto text-xs font-medium text-muted-foreground">Advanced</p>
                    </button>
                  </div>
                </div>

                {/* Strategy-specific body */}
                {mappingStrategy === 'clone' && selected.kind !== 'layout' ? (
                  <CloneFieldsTable item={selected} />
                ) : mappingStrategy === 'existing' && selected.kind !== 'layout' ? (
                  <MapToExistingWizard
                    item={selected}
                    projectComponents={projectComponents}
                    step={existingStep}
                    setStep={setExistingStep}
                    query={existingQuery}
                    setQuery={setExistingQuery}
                    typeFilter={existingTypeFilter}
                    setTypeFilter={setExistingTypeFilter}
                    groupFilter={existingGroupFilter}
                    setGroupFilter={setExistingGroupFilter}
                    selectedDefId={existingSelected}
                    setSelectedDefId={setExistingSelected}
                    fieldMap={existingFieldMap}
                    setFieldMap={setExistingFieldMap}
                    onConfirm={(compId) => {
                      // Find the selected component from projectComponents
                      const comp = projectComponents.find((c) => c.id === compId);
                      if (!comp) { toast.error('Component not found.'); return; }
                      startBusy(async () => {
                        // Upsert a library definition for this Nexus component
                        const r = await upsertLibraryDefinitionForComponent(
                          workbench.mapping.projectId,
                          comp,
                        );
                        if (!r.success) { toast.error(r.error.message); return; }
                        // Now set the mapping link with the real library definition ID
                        await setLink(selected, { targetDefinitionId: r.data.id, status: 'mapped', mappingType: 'existing' });
                      });
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                      <ConnectorLogo provider={workbench.provider} className="size-4 shrink-0" />
                      Source ({getCmsConnectorLabel(workbench.provider)})
                    </p>
                    {selected.kind === 'layout' ? (
                      selected.dependsOn.length > 0 ? (
                        <>
                          <p className="mb-2 text-xs text-muted-foreground">Allowed components discovered from Blueprint relationships.</p>
                          <ul className="space-y-1.5 text-sm">
                            {selected.dependsOn.map((depId) => {
                              const dep = itemById.get(depId);
                              const depName = dep?.name ?? depId.split(':')[1] ?? depId;
                              const depStatus = dep ? STATUS_META[dep.status] : null;
                              return (
                                <li key={depId} className="flex items-center justify-between">
                                  <span className="truncate pr-2">{depName}</span>
                                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Component</span>
                                    {depStatus ? <Badge variant={depStatus.badge} className="text-[10px]">{depStatus.label}</Badge> : null}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="mt-3">
                            <Button variant="outline" size="sm" onClick={() => reviewRequiredComponents(selected)}>
                              Review required components
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No allowed components discovered.</p>
                      )
                    ) : selected.sourceFields.length > 0 ? (
                      <ul className="space-y-1.5 text-sm">
                        {selected.sourceFields.map((f) => (
                          <li key={f.name} className="flex items-center justify-between">
                            <span>{f.name}</span>
                            <span className="text-xs text-muted-foreground">{f.type}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No fields.</p>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-xs font-semibold">Suggestions</p>
                    {selected.suggestions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {selected.suggestions.slice(0, 4).map((s, i) => {
                          const chosen = selected.targetDefinitionId === s.definitionId;
                          return (
                            <li key={s.definitionId}>
                              <button
                                type="button"
                                onClick={() => setLink(selected, { targetDefinitionId: s.definitionId, status: 'mapped', mappingType: 'existing' })}
                                className={cn(
                                  'flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm',
                                  chosen ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  {i === 0 && <Badge variant="warning" className="text-[9px]">Best</Badge>}
                                  {s.name}
                                </span>
                                <span className="text-xs text-muted-foreground">{s.confidence}%</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No matching library definitions.</p>
                    )}
                  </div>
                </div>
                )}

                {/* field mapping — only shown for advanced/layout strategy, not when the existing wizard handles it */}
                {mappingStrategy !== 'clone' && mappingStrategy !== 'existing' && selected.kind !== 'layout' && target && (
                  <FieldMapping item={selected} target={target} onChange={(fieldMap) => setLink(selected, { fieldMap })} />
                )}

                {/* footer actions */}
                <div className="flex items-center justify-between border-t pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setLink(selected, { status: 'skipped' })} disabled={busy}>
                    <CircleOff className="size-4" /> Skip
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      <Plus className="size-4" /> Create new {selected.kind === 'layout' ? 'layout' : selected.kind === 'contentType' ? 'content type' : 'component'}
                    </Button>
                    <Button size="sm" onClick={() => setLink(selected, { status: 'mapped', mappingType: mappingStrategy })} disabled={busy || !selected.targetDefinitionId}>
                       <CheckCircle2 className="size-4" /> Accept mapping
                     </Button>
                   </div>
                 </div>
                 </div>
                 )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a source item to map.
            </div>
          )}
        </div>

        {/* ── Right — target library detail ── */}
        <div className="h-[700px] rounded-xl border bg-card shadow-sm">
          {target ? (
            <TargetDetail def={target} componentNameByKey={componentNameByKey} />
          ) : (
            <div className="flex h-full items-center justify-center p-5 text-center text-sm text-muted-foreground">
              Choose a target from the suggestions to see its Nexus Library definition.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, tint, bg, label, value, total }: {
  icon: typeof CheckCircle2; tint: string; bg: string; label: string; value: number; total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-1 items-center gap-2.5">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', bg)}>
        <Icon className={cn('size-4', tint)} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{pct}%</p>
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('size-2 rounded-full', dot)} /> {label}
    </span>
  );
}

function FieldMapping({ item, target, onChange }: {
  item: MappingItem;
  target: LibraryDefinitionView;
  onChange: (fieldMap: { sourceField: string; targetField: string; transform?: string }[]) => void;
}) {
  const targetFields = target.dialog.dialog;
  const currentBySource = new Map(item.fieldMap.map((e) => [e.sourceField, e]));

  function set(sourceField: string, targetField: string) {
    const next = item.sourceFields.map((sf) => {
      if (sf.name === sourceField) {
        return { sourceField, targetField, transform: currentBySource.get(sf.name)?.transform };
      }
      const existing = currentBySource.get(sf.name);
      return existing ?? { sourceField: sf.name, targetField: '' };
    });
    onChange(next.filter((e) => e.targetField));
  }

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Source Field</span>
        <span />
        <span>Nexus Field</span>
      </div>
      {item.sourceFields.map((sf) => {
        const entry = currentBySource.get(sf.name);
        return (
          <div key={sf.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4 py-2 text-sm last:border-0">
            <span className="flex items-center gap-2">
              <Link2 className="size-3.5 text-muted-foreground" />
              {sf.name}
              <span className="text-xs text-muted-foreground">{sf.type}</span>
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <select
                value={entry?.targetField ?? ''}
                onChange={(e) => set(sf.name, e.target.value)}
                className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">—</option>
                {targetFields.map((tf) => (
                  <option key={tf.id} value={tf.name}>{tf.label || tf.name}</option>
                ))}
              </select>
              {entry?.transform && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">{entry.transform}</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TargetDetail({ def, componentNameByKey }: { def: LibraryDefinitionView; componentNameByKey: Map<string, string>; }) {
  const Icon = def.kind === 'layout' ? LayoutTemplate : def.kind === 'contentType' ? Database : Boxes;
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="size-4" /> Nexus Library
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="size-5 text-primary" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{def.name}</h3>
              <Badge variant="success" className="text-[10px] capitalize">{def.status}</Badge>
            </div>
            {def.description && <p className="text-xs text-muted-foreground">{def.description}</p>}
          </div>
        </div>

        {def.kind === 'layout' ? (
          <>
            <div className="rounded-lg border">
              <p className="border-b px-3 py-1.5 text-xs font-semibold">Regions ({def.composition?.regions.length ?? 0})</p>
              {def.composition && def.composition.regions.length > 0 ? (
                def.composition.regions.map((region) => (
                  <div key={region.key} className="flex items-center justify-between border-b px-3 py-1.5 text-sm last:border-0">
                    <span>{region.name}</span>
                    <span className="text-xs text-muted-foreground">{region.location}</span>
                  </div>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">No regions.</p>
              )}
            </div>
            <div className="rounded-lg border">
              <p className="border-b px-3 py-1.5 text-xs font-semibold">Allowed Components ({def.composition?.usesComponentKeys.length ?? 0})</p>
              {def.composition && def.composition.usesComponentKeys.length > 0 ? (
                def.composition.usesComponentKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between border-b px-3 py-1.5 text-sm last:border-0">
                    <span>{componentNameByKey.get(key) ?? key}</span>
                    <span className="text-xs text-muted-foreground">Component</span>
                  </div>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">No allowed components.</p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border">
            <p className="border-b px-3 py-1.5 text-xs font-semibold">Fields ({def.dialog.dialog.length})</p>
            {def.dialog.dialog.length > 0 ? (
              def.dialog.dialog.map((f) => (
                <div key={f.id} className="flex items-center justify-between border-b px-3 py-1.5 text-sm last:border-0">
                  <span>{f.label || f.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {f.type}
                    {f.required && <span className="text-red-500">Required</span>}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-3 py-3 text-xs text-muted-foreground">No fields.</p>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CloneFieldsTable — shown in center pane when strategy = 'clone'
   Displays all source fields that will be copied 1:1 to the Nexus Library.
────────────────────────────────────────────────────────────────────────── */

function CloneFieldsTable({ item }: { item: MappingItem }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fields = item.sourceFields;

  return (
    <div className="flex flex-col gap-4">
      {/* Fields table */}
      <div className="overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Fields to be cloned ({fields.length})</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Field name</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-center font-medium">Required</th>
              <th className="px-4 py-2 text-center font-medium">Multilingual</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fields.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No fields discovered.
                </td>
              </tr>
            ) : (
              fields.map((f) => (
                <tr key={f.name} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      <FieldTypeIcon type={f.type} />
                      {f.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.type}</td>
                  <td className="px-4 py-2.5 text-center">
                    {f.required ? (
                      <CheckCircle2 className="mx-auto size-4 text-green-500" />
                    ) : (
                      <span className="mx-auto block text-center text-sm text-red-400">✕</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">—</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        <span className="mt-0.5 shrink-0">ℹ</span>
        <span>All fields, relationships and configurations will be copied exactly as in the source component.</span>
      </div>

      {/* Advanced options collapsible */}
      <div className="rounded-xl border">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm"
        >
          <span>
            <span className="font-medium">Advanced options</span>
            <span className="ml-1 text-muted-foreground">(name, group, folder, permissions)</span>
          </span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', advancedOpen && 'rotate-180')} />
        </button>
        {advancedOpen && (
          <div className="border-t px-4 py-4">
            <p className="text-xs text-muted-foreground">Advanced clone options coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Flatten Nexus component dialog into a list of mappable fields.
 *  Skips container nodes (tabs, tab, group, multifield) — recurses into their
 *  children to find actual field nodes. */
function flattenDialogFields(dialog: unknown): Array<{ name: string; label: string; type: string }> {
  if (!Array.isArray(dialog)) return [];

  const CONTAINER_TYPES = new Set(['tabs', 'tab', 'group', 'multifield', 'object']);

  const fields: Array<{ name: string; label: string; type: string }> = [];

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      const type = String(n.type ?? '');

      // Container — only recurse, don't emit
      if (CONTAINER_TYPES.has(type)) {
        const children = n.children ?? n.fields ?? n.items;
        if (Array.isArray(children)) walk(children);
        continue;
      }

      // Field node — emit if it has a name/id
      if (n.name || n.id) {
        fields.push({
          name: String(n.name ?? n.id ?? ''),
          label: String(n.label ?? n.name ?? n.id ?? ''),
          type,
        });
      }

      // Also recurse into any children (nested structures)
      const children = n.children ?? n.fields;
      if (Array.isArray(children)) walk(children);
    }
  }

  walk(dialog);
  return fields;
}

/** Format a date as a relative time string (e.g. "2 days ago"). */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/** Small icon hinting at the field type */
function FieldTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls = 'flex size-5 shrink-0 items-center justify-center rounded border text-[10px] text-muted-foreground';
  if (t.includes('text') || t.includes('string')) return <span className={cls}>T</span>;
  if (t.includes('select') || t.includes('enum')) return <span className={cls}>≡</span>;
  if (t.includes('bool') || t.includes('check')) return <span className={cls}>☑</span>;
  if (t.includes('asset') || t.includes('media') || t.includes('image')) return <span className={cls}>⬜</span>;
  if (t.includes('link') || t.includes('ref')) return <span className={cls}>↗</span>;
  if (t.includes('date')) return <span className={cls}>📅</span>;
  return <span className={cls}>·</span>;
}

/* ──────────────────────────────────────────────────────────────────────────
   MapToExistingWizard — 3-step wizard for "Map to existing component"
   Step 1: Select Nexus Library component
   Step 2: Map fields
   Step 3: Review & confirm
────────────────────────────────────────────────────────────────────────── */

function MapToExistingWizard({
  item,
  projectComponents,
  step,
  setStep,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  groupFilter,
  setGroupFilter,
  selectedDefId,
  setSelectedDefId,
  fieldMap,
  setFieldMap,
  onConfirm,
}: {
  item: MappingItem;
  projectComponents: ProjectComponentWithDialog[];
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;
  query: string;
  setQuery: (q: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  groupFilter: string;
  setGroupFilter: (g: string) => void;
  selectedDefId: string | null;
  setSelectedDefId: (id: string | null) => void;
  fieldMap: Array<{ sourceField: string; targetField: string }>;
  setFieldMap: (m: Array<{ sourceField: string; targetField: string }>) => void;
  onConfirm: (defId: string) => void;
}) {
  const suggestionNames = useMemo(
    () => new Map(item.suggestions.map((s) => [s.name.toLowerCase(), s.confidence])),
    [item.suggestions],
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projectComponents
      .filter((c) => !q || (c.name ?? '').toLowerCase().includes(q) || (c.title ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        const ca = suggestionNames.get((a.name ?? '').toLowerCase()) ?? 0;
        const cb = suggestionNames.get((b.name ?? '').toLowerCase()) ?? 0;
        if (cb !== ca) return cb - ca;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [projectComponents, query, suggestionNames]);

  const selectedComponent = selectedDefId ? projectComponents.find((c) => c.id === selectedDefId) : null;

  const STEPS = [
    { n: 1, label: 'Select Nexus Library component' },
    { n: 2, label: 'Map fields' },
    { n: 3, label: 'Review & confirm' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Step indicator — full width, connector lines flex-grow */}
      <div className="flex w-full items-center">
        {STEPS.map(({ n, label }, i) => (
          <div key={n} className={cn('flex items-center', i < STEPS.length - 1 ? 'flex-1' : '')}>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                step === n ? 'bg-primary text-primary-foreground' :
                step > n ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground',
              )}>
                {n}
              </span>
              <span className={cn(
                'text-xs whitespace-nowrap',
                step === n ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-2 h-px flex-1', step > i + 1 ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Select component ── */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold">Select a Nexus Library component</p>
            <p className="text-xs text-muted-foreground">Choose the target component that best matches this source component.</p>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Nexus components…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Component list */}
          <div className="overflow-hidden rounded-xl border">
            {candidates.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {projectComponents.length === 0 ? 'No components in this environment.' : 'No components found.'}
              </p>
            ) : (
              <ul className="max-h-80 divide-y overflow-y-auto">
                {candidates.map((comp) => {
                  const confidence = suggestionNames.get((comp.name ?? '').toLowerCase());
                  const isSelected = selectedDefId === comp.id;
                  return (
                    <li key={comp.id} className={cn(isSelected && 'outline outline-2 outline-primary -outline-offset-2')}>
                      <button
                        type="button"
                        onClick={() => setSelectedDefId(comp.id)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/40',
                        )}
                      >
                        <span className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}>
                          <Boxes className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{comp.title || comp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Component · {comp.version ?? 'v—'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          {confidence !== undefined && (
                            <span className={cn(
                              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              confidence >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                              confidence >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                              'bg-muted text-muted-foreground',
                            )}>
                              {confidence}%
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Next button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!selectedDefId}
              onClick={() => setStep(2)}
            >
              Next: Map fields <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Map fields ── */}
      {step === 2 && selectedComponent && (
        <MapFieldsStep
          item={item}
          selectedComponent={selectedComponent}
          initialFieldMap={fieldMap}
          onBack={() => setStep(1)}
          onNext={(mapped) => { setFieldMap(mapped); setStep(3); }}
        />
      )}

      {/* ── Step 3: Review & confirm ── */}
      {step === 3 && selectedComponent && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold">Review & confirm</p>
            <p className="text-xs text-muted-foreground">
              Check the mapping below, then confirm to save.
            </p>
          </div>

          {/* Source → Target header */}
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Boxes className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">Source · Blueprint component</p>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Boxes className="size-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selectedComponent.title || selectedComponent.name}</p>
                <p className="text-xs text-muted-foreground">Target · {selectedComponent.version ?? 'v—'}</p>
              </div>
            </div>
          </div>

          {/* Field mapping summary */}
          <div className="overflow-hidden rounded-xl border">
            <div className="border-b bg-muted/30 px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Field mappings ({fieldMap.filter((e) => e.targetField).length} of {item.sourceFields.length} mapped)
              </p>
            </div>
            {item.sourceFields.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No source fields.</p>
            ) : (
              <ul className="divide-y">
                {item.sourceFields.map((sf) => {
                  const mapped = fieldMap.find((e) => e.sourceField === sf.name);
                  return (
                    <li key={sf.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <FieldTypeIcon type={sf.type} />
                        <span className="truncate font-medium">{sf.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{sf.type}</span>
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      {mapped?.targetField ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          <span className="truncate">{mapped.targetField}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">— skipped —</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              <ChevronLeft className="size-4" /> Back
            </Button>
            <Button size="sm" onClick={() => onConfirm(selectedComponent.id)}>
              <CheckCircle2 className="size-4" /> Confirm mapping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MappedSummary — shown in center pane when a component is already mapped.
   Displays the current mapping details and a "Remap" button to restart.
────────────────────────────────────────────────────────────────────────── */

function MapFieldsStep({
  item,
  selectedComponent,
  initialFieldMap,
  onBack,
  onNext,
}: {
  item: MappingItem;
  selectedComponent: ProjectComponentWithDialog;
  initialFieldMap: Array<{ sourceField: string; targetField: string }>;
  onBack: () => void;
  onNext: (mapped: Array<{ sourceField: string; targetField: string }>) => void;
}) {
  const targetFields = useMemo(() => flattenDialogFields(selectedComponent.dialog), [selectedComponent.dialog]);

  // Controlled state: map of sourceField → targetField value
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sf of item.sourceFields) {
      const existing = initialFieldMap.find((e) => e.sourceField === sf.name);
      if (existing?.targetField) {
        init[sf.name] = existing.targetField;
        continue;
      }
      const autoMatch = targetFields.find(
        (tf) => tf.name.toLowerCase() === sf.name.toLowerCase() || tf.label.toLowerCase() === sf.name.toLowerCase(),
      );
      init[sf.name] = autoMatch?.name ?? '';
    }
    return init;
  });

  function handleChange(sourceField: string, targetField: string) {
    setSelections((prev) => ({ ...prev, [sourceField]: targetField }));
  }

  function handleNext() {
    const mapped = Object.entries(selections)
      .map(([sourceField, targetField]) => ({ sourceField, targetField }))
      .filter((e) => e.targetField);
    onNext(mapped);
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">Map fields</p>
        <p className="text-xs text-muted-foreground">
          Match source fields from <span className="font-medium">{item.name}</span> to target fields in{' '}
          <span className="font-medium">{selectedComponent.title || selectedComponent.name}</span>.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Source field</span>
          <span />
          <span>Target field ({targetFields.length})</span>
        </div>
        {item.sourceFields.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No source fields.</p>
        ) : (
          item.sourceFields.map((sf) => (
            <div key={sf.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4 py-2 text-sm last:border-0">
              <span className="flex items-center gap-1.5">
                <FieldTypeIcon type={sf.type} />
                <span className="truncate">{sf.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{sf.type}</span>
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <select
                value={selections[sf.name] ?? ''}
                onChange={(e) => handleChange(sf.name, e.target.value)}
                className="h-7 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">— skip —</option>
                {targetFields.map((tf) => (
                  <option key={tf.name} value={tf.name}>{tf.label || tf.name}</option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" /> Back
        </Button>
        <Button size="sm" onClick={handleNext}>
          Next: Review <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function MappedSummary({
  item,
  target,
  onRemap,
  onSkip,
  busy,
}: {
  item: MappingItem;
  target: LibraryDefinitionView | undefined;
  onRemap: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const mappedCount = item.fieldMap.filter((e) => e.targetField).length;
  const totalCount = item.sourceFields.length;
  const pct = totalCount > 0 ? Math.round((mappedCount / totalCount) * 100) : 0;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
          <CheckCircle2 className="size-7 text-green-600" />
        </span>
        <p className="text-base font-semibold">This component is already mapped</p>
        <p className="text-sm text-muted-foreground">
          {item.mappingType === 'clone'
            ? 'Cloned 1:1 — an identical component will be created in the target.'
            : item.mappingType === 'existing'
            ? 'Mapped to an existing Nexus Library component.'
            : item.mappingType === 'advanced'
            ? 'Advanced mapping — split, merged or composed from multiple components.'
            : 'It is mapped to a Nexus Library component.'}
        </p>
      </div>

      {/* Source → Target card */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Boxes className="size-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">Source component</p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Boxes className="size-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {target?.name ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.mappingType === 'clone'
                  ? 'Clone 1:1'
                  : item.mappingType === 'advanced'
                  ? 'Advanced mapping'
                  : 'Nexus Library component'}
                {target ? ' · v0.0' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mapped fields</p>
            <p className="mt-1 text-lg font-semibold">{mappedCount} / {totalCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Field mapping</p>
            <p className="mt-1 text-lg font-semibold">{pct}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last updated</p>
            <p className="mt-1 text-sm font-medium">
              {item.updatedAt
                ? formatRelativeTime(item.updatedAt)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mapped by</p>
            <p className="mt-1 text-sm font-medium">
              {item.mappedByName ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => setShowDetails((v) => !v)}
          disabled={busy}
        >
          <GitCompare className="size-4" />
          {showDetails ? 'Hide mapping details' : 'View mapping details'}
        </Button>
        <Button
          size="sm"
          className="h-10"
          onClick={onRemap}
          disabled={busy}
        >
          <LoaderCircle className="size-4" />
          Remap component
        </Button>
      </div>

      {/* Field mapping details (collapsible) */}
      {showDetails && item.fieldMap.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div className="border-b bg-muted/30 px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground">Field mappings</p>
          </div>
          <ul className="divide-y">
            {item.sourceFields.map((sf) => {
              const mapped = item.fieldMap.find((e) => e.sourceField === sf.name);
              return (
                <li key={sf.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <FieldTypeIcon type={sf.type} />
                    <span className="truncate">{sf.name}</span>
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  {mapped?.targetField ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span className="truncate">{mapped.targetField}</span>
                    </span>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">— skipped —</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Remap info box */}
      <div className="flex items-start gap-2.5 rounded-xl border bg-muted/30 px-4 py-3">
        <span className="mt-0.5 shrink-0 text-sm text-muted-foreground">ℹ</span>
        <div>
          <p className="text-sm font-medium">What happens when you remap?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You&apos;ll be able to choose a different Nexus Library component or adjust the field mapping.
            <br />
            Your current mapping will be saved as a previous version.
          </p>
        </div>
      </div>
    </div>
  );
}
