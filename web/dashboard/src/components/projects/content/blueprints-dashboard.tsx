'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  CheckCircle2,
  Clock,
  Database,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Layers,
  Link2,
  List,
  LoaderCircle,
  MoreHorizontal,
  Network,
  Plug,
  Plus,
  Search,
  Table2,
  Trash2,
  Download,
  GitCompare,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cmsLogoByKey } from './cms-logos';
import { getCmsConnectorLabel, CMS_CONNECTOR_OPTIONS } from '@/data/cms/config';
import { deleteBlueprint } from '@/data/cms/actions';
import type { BlueprintView } from '@/data/cms/dto';

/* ----------------------------- helpers -------------------------------- */

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const STATUS_BADGE: Record<
  BlueprintView['status'],
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
  ready: { label: 'Ready', variant: 'success' },
  discovering: { label: 'Discovering', variant: 'secondary' },
  warning: { label: 'Warning', variant: 'warning' },
  error: { label: 'Error', variant: 'destructive' },
};

/** The 6 entity stat rows shown inside a card (left + right columns). */
const ENTITY_STATS: {
  label: string;
  icon: LucideIcon;
  kinds: string[];
}[] = [
  { label: 'Pages', icon: FileText, kinds: ['page'] },
  { label: 'Assets', icon: ImageIcon, kinds: ['assetFolder', 'asset'] },
  { label: 'Components', icon: Boxes, kinds: ['component'] },
  { label: 'Languages', icon: Globe, kinds: ['language'] },
  { label: 'Templates', icon: Layers, kinds: ['template', 'editableTemplate'] },
  { label: 'Relationships', icon: Link2, kinds: ['reference', 'graphqlSchema'] },
  { label: 'Content Models', icon: Table2, kinds: ['model'] },
];

function statValue(bp: BlueprintView, kinds: string[]): number {
  return bp.groups
    .filter((g) => kinds.includes(g.kind))
    .reduce((sum, g) => sum + g.count, 0);
}

/* ------------------------------ stat cards ---------------------------- */

function TopStat({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn('flex size-10 items-center justify-center rounded-lg', tint)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/* ------------------------------ card ---------------------------------- */

function BlueprintCard({
  blueprint,
  href,
  onDeleted,
  compact,
}: {
  blueprint: BlueprintView;
  href: string;
  onDeleted: () => void;
  compact?: boolean;
}) {
  const Logo = cmsLogoByKey[blueprint.provider];
  const status = STATUS_BADGE[blueprint.status];
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBlueprint(blueprint.definitionId);
      if (result.success) {
        toast.success('Blueprint deleted.');
        setOpen(false);
        onDeleted();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  const deleteDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-red-600"
          aria-label="Delete blueprint"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this Blueprint?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes &ldquo;{blueprint.name}&rdquo; (v
            {blueprint.version}) and all its discovered entities. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={pending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="size-9 shrink-0 text-base" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{blueprint.name}</p>
              <Badge variant={status.variant} className="text-[10px]">
                {status.label}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {getCmsConnectorLabel(blueprint.provider)}
              {blueprint.environment ? ` · ${blueprint.environment}` : ''} · v
              {blueprint.version} · {blueprint.totalItems.toLocaleString()} items
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={href}>Open</Link>
          </Button>
          {deleteDialog}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Logo className="size-11 shrink-0 text-lg" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{blueprint.name}</h3>
              <Badge variant={status.variant} className="text-[10px]">
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {getCmsConnectorLabel(blueprint.provider)}
            </p>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {blueprint.environment && (
          <Badge variant="secondary" className="text-[10px]">
            {blueprint.environment}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          Blueprint v{blueprint.version}
        </span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" /> Last discovery:{' '}
        {timeAgo(blueprint.created_at)}
      </p>

      {/* Entity stat grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
        {ENTITY_STATS.map((stat) => {
          const value = statValue(blueprint, stat.kinds);
          const StatIcon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <StatIcon className="size-3.5" /> {stat.label}
              </span>
              <span className="font-medium">{value.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {blueprint.status === 'ready' && (
        <div className="mt-4">
          <Badge variant="success" className="text-[10px]">
            Blueprint Ready
          </Badge>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span>Created by {blueprint.discoveredBy ?? 'Unknown'}</span>
        <span>{new Date(blueprint.created_at).toLocaleDateString()}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={href}>Open</Link>
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <GitCompare className="size-3.5" /> Compare
        </Button>
        {deleteDialog}
      </div>
    </div>
  );
}

/* --------------------------- recent activity -------------------------- */

function RecentActivity({ blueprints }: { blueprints: BlueprintView[] }) {
  const items = [...blueprints]
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, 6);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Recent Activity</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((bp) => (
            <li key={bp.definitionId} className="flex items-start gap-3">
              <span className="mt-0.5">
                <CheckCircle2 className="size-4 text-green-600" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Blueprint created</p>
                <p className="truncate text-xs text-muted-foreground">
                  {bp.name} ({getCmsConnectorLabel(bp.provider)})
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(bp.created_at)}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                v{bp.version}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- dashboard ------------------------------ */

export function BlueprintsDashboard({
  blueprints,
  projectId,
  env,
  connectedCms,
}: {
  blueprints: BlueprintView[];
  projectId: string;
  env: string | null;
  connectedCms: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cmsFilter, setCmsFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const environmentsList = useMemo(
    () =>
      Array.from(
        new Set(
          blueprints
            .map((b) => b.environment)
            .filter((e): e is string => !!e),
        ),
      ),
    [blueprints],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = blueprints.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (cmsFilter !== 'all' && b.provider !== cmsFilter) return false;
      if (envFilter !== 'all' && b.environment !== envFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.created_at.getTime() - b.created_at.getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'items':
          return b.totalItems - a.totalItems;
        default:
          return b.created_at.getTime() - a.created_at.getTime();
      }
    });
    return list;
  }, [blueprints, query, cmsFilter, envFilter, statusFilter, sort]);

  const stats = {
    total: blueprints.length,
    connected: connectedCms,
    ready: blueprints.filter((b) => b.status === 'ready').length,
    recent: blueprints.filter(
      (b) => Date.now() - b.created_at.getTime() < 24 * 60 * 60 * 1000,
    ).length,
  };

  const hrefFor = (id: string) =>
    `/projects/${projectId}/content/blueprints/${id}${env ? `?env=${env}` : ''}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <FileText className="size-7" /> Blueprints
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse and manage the discovered structure of your connected CMS
            projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">
            <Plus className="size-4" /> Discover Blueprint
          </Button>
          <Button variant="outline" size="sm">
            <GitCompare className="size-4" /> Compare
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Import
          </Button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TopStat
          label="Blueprints"
          value={stats.total}
          sub={`Across ${connectedCms} CMS connections`}
          icon={Globe}
          tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40"
        />
        <TopStat
          label="Connected CMS"
          value={stats.connected}
          sub="All connections active"
          icon={Plug}
          tint="bg-green-50 text-green-600 dark:bg-green-950/40"
        />
        <TopStat
          label="Ready for Mapping"
          value={stats.ready}
          sub="Blueprints ready to use"
          icon={Layers}
          tint="bg-blue-50 text-blue-600 dark:bg-blue-950/40"
        />
        <TopStat
          label="Recently Updated"
          value={stats.recent}
          sub="In the last 24 hours"
          icon={Clock}
          tint="bg-orange-50 text-orange-600 dark:bg-orange-950/40"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blueprints…"
            className="h-9 pl-7 text-sm"
          />
        </div>
        <Select value={cmsFilter} onValueChange={setCmsFilter}>
          <SelectTrigger className="h-9 w-[140px] text-sm">
            <SelectValue placeholder="CMS Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CMS</SelectItem>
            {Object.values(CMS_CONNECTOR_OPTIONS).map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {environmentsList.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="discovering">Discovering</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[170px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Sort: Newest Discovery</SelectItem>
            <SelectItem value="oldest">Sort: Oldest Discovery</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="items">Sort: Most Items</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={cn(
              'flex size-7 items-center justify-center rounded',
              view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'flex size-7 items-center justify-center rounded',
              view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
            aria-label="List view"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* Content + right rail */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          {blueprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-12 text-center">
              <Network className="size-10 text-muted-foreground" strokeWidth={1.25} />
              <p className="mt-4 text-sm font-medium">No Blueprints yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Run discovery on a CMS connection to build your first Blueprint.
                Go to Connections, then use the Discover action.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">
              No blueprints match your filters.
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((bp) => (
                <BlueprintCard
                  key={bp.definitionId}
                  blueprint={bp}
                  href={hrefFor(bp.definitionId)}
                  onDeleted={() => router.refresh()}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((bp) => (
                <BlueprintCard
                  key={bp.definitionId}
                  blueprint={bp}
                  href={hrefFor(bp.definitionId)}
                  onDeleted={() => router.refresh()}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <RecentActivity blueprints={blueprints} />
          <div className="rounded-xl border bg-muted/30 p-5 text-center shadow-sm">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Database className="size-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">
              Blueprints are the foundation
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use blueprints to map, migrate and synchronize content between
              systems.
            </p>
            <Link
              href={`/projects/${projectId}/content/overview${env ? `?env=${env}` : ''}`}
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Learn more about Blueprints →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
