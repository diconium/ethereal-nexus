'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Compass,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { AddCmsDialog } from './add-cms-dialog';
import { cmsLogoByKey } from './cms-logos';
import { getCmsConnectorLabel } from '@/data/cms/config';
import {
  buildBlueprint,
  deleteCmsConnection,
  discoverCapabilities,
  validateCmsConnection,
} from '@/data/cms/actions';
import { CAPABILITY_LABELS } from '@/data/cms/capabilities';
import type { CmsConnectionView } from '@/data/cms/dto';

function StatusBadge({ status }: { status: string }) {
  if (status === 'valid' || status === 'active' || status === 'connected') {
    return (
      <Badge variant="success" className="gap-1">
        <span className="size-1.5 rounded-full bg-green-500" /> Valid
      </Badge>
    );
  }
  if (status === 'invalid' || status === 'error') {
    return <Badge variant="destructive">Invalid</Badge>;
  }
  if (status === 'warning') {
    return <Badge variant="warning">Warning</Badge>;
  }
  return <Badge variant="outline">Unvalidated</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'source') {
    return <Badge variant="secondary">Source</Badge>;
  }
  if (role === 'target') {
    return <Badge variant="secondary" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">Target</Badge>;
  }
  return null;
}

function ConnectionCard({
  connection,
  onChanged,
  onEdit,
}: {
  connection: CmsConnectionView;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const Logo = cmsLogoByKey[connection.provider];
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<
    'validate' | 'capabilities' | 'discover' | 'delete' | null
  >(null);

  function runValidate() {
    setAction('validate');
    startTransition(async () => {
      const result = await validateCmsConnection(connection.id);
      if (result.success) {
        toast.success(
          result.data.ok
            ? 'Connection validated successfully.'
            : 'Validation completed with issues.',
        );
        onChanged();
      } else {
        toast.error(result.error.message);
      }
      setAction(null);
    });
  }

  function runCapabilities() {
    setAction('capabilities');
    startTransition(async () => {
      const result = await discoverCapabilities(connection.id);
      if (result.success) {
        const supported = result.data.capabilities.filter(
          (c) => c.supported,
        ).length;
        toast.success(`Detected ${supported} capabilities.`);
        onChanged();
      } else {
        toast.error(result.error.message);
      }
      setAction(null);
    });
  }

  function runDiscover() {
    setAction('discover');
    startTransition(async () => {
      // Discovery is scoped to the project stored on the connection config.
      const result = await buildBlueprint(connection.id);
      if (result.success) {
        toast.success(
          `Blueprint built (${result.data.nodeTotal.toLocaleString()} items).`,
        );
        onChanged();
      } else {
        toast.error(result.error.message);
      }
      setAction(null);
    });
  }

  function runDelete() {
    setAction('delete');
    startTransition(async () => {
      const result = await deleteCmsConnection(connection.id);
      if (result.success) {
        toast.success('Connection deleted.');
        onChanged();
      } else {
        toast.error(result.error.message);
      }
      setAction(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Logo className="size-11 text-xl" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">
              {getCmsConnectorLabel(connection.provider)}
            </h3>
            <p className="text-sm text-muted-foreground">
              Connection: {connection.name}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={connection.status} />
          <RoleBadge role={connection.role ?? 'general'} />
          {connection.health && (
            <span className="text-xs text-muted-foreground">
              Health{' '}
              <span
                className={
                  connection.health.status === 'healthy'
                    ? 'font-medium text-green-600'
                    : connection.health.status === 'warning'
                      ? 'font-medium text-amber-600'
                      : 'font-medium text-red-600'
                }
              >
                {connection.health.score}%
              </span>
              {connection.health.warnings > 0 &&
                ` · ${connection.health.warnings} warning${connection.health.warnings > 1 ? 's' : ''}`}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Updated:{' '}
            <span className="font-medium">
              {new Date(connection.updated_at).toLocaleString()}
            </span>
          </span>
        </div>

        {connection.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {connection.capabilities
              .filter((c) => c.supported)
              .map((c) => (
                <span
                  key={c.key}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  {CAPABILITY_LABELS[c.key] ?? c.key}
                </span>
              ))}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" disabled={pending}>
            <ExternalLink className="size-3.5" /> Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={runValidate}
          >
            {pending && action === 'validate' ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}{' '}
            Validate
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={runCapabilities}
          >
            {pending && action === 'capabilities' ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}{' '}
            Capabilities
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={runDiscover}
          >
            {pending && action === 'discover' ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Compass className="size-3.5" />
            )}{' '}
            Discover
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={onEdit}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                className="text-red-600 hover:text-red-600"
              >
                {pending && action === 'delete' ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}{' '}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{connection.name}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The connection and its validation history
                  will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={runDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export function CmsConnections({
  projectId,
  environmentId,
  connections,
}: {
  projectId: string;
  environmentId: string | null;
  connections: CmsConnectionView[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const refresh = () => router.refresh();

  function openAdd() {
    setEditingId(null);
    setDialogOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setDialogOpen(true);
  }
  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            CMS Connections
          </h1>
          <p className="mt-1 text-muted-foreground">
            Connect and manage the Content Management Systems used by your
            organization.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" /> Add CMS
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Connected CMS Platforms
        </h2>
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-12 text-center">
            <p className="text-sm font-medium">No connections yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Add a CMS connection to start discovering content and building
              Blueprints.
            </p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="size-4" /> Add CMS
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onChanged={refresh}
                onEdit={() => openEdit(connection.id)}
              />
            ))}
          </div>
        )}
      </div>

      <AddCmsDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        projectId={projectId}
        environmentId={environmentId}
        onSaved={refresh}
        editConnectionId={editingId}
      />
    </div>
  );
}
