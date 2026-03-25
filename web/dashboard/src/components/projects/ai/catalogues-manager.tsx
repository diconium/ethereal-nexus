'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TextArea } from '@/components/ui/text-area';
import { toast } from 'sonner';
import { deleteCatalogue, upsertCatalogue } from '@/data/ai/actions';
import type { Catalogue } from '@/data/ai/dto';
import { AI_STATE_UPDATED_EVENT } from '@/lib/ai-events';
import {
  AI_PROVIDER_BADGE_STYLES,
  AI_PROVIDER_OPTIONS,
  getAiProviderLabel,
  type AiProvider,
} from '@/data/ai/provider';

type CataloguesManagerProps = {
  projectId: string;
  environmentId: string;
  catalogues: Catalogue[];
};

type CatalogueFormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  provider: AiProvider;
  project_endpoint: string;
  provider_agent_id: string;
  system_prompt: string;
  agent_id: string;
  api_url: string;
  agent_principal_id: string;
  tenant_id: string;
  activity_protocol_endpoint: string;
  responses_api_endpoint: string;
  show_in_sidebar: boolean;
};

const EMPTY_FORM: CatalogueFormState = {
  name: '',
  slug: '',
  description: '',
  provider: 'microsoft-foundry',
  project_endpoint: '',
  provider_agent_id: '',
  system_prompt: '',
  agent_id: '',
  api_url: '',
  agent_principal_id: '',
  tenant_id: '',
  activity_protocol_endpoint: '',
  responses_api_endpoint: '',
  show_in_sidebar: false,
};

function autoSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function notifySidebarRefresh() {
  window.dispatchEvent(new CustomEvent(AI_STATE_UPDATED_EVENT));
}

export function CataloguesManager({
  projectId,
  environmentId,
  catalogues,
}: CataloguesManagerProps) {
  const [items, setItems] = useState(catalogues);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<CatalogueFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Catalogue | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(form.id);
  const overview = useMemo(() => {
    const sidebarCount = items.filter((item) => item.show_in_sidebar).length;
    const foundryCount = items.filter(
      (item) => item.provider === 'microsoft-foundry',
    ).length;
    const latestUpdated = items.reduce<Date | null>((latest, item) => {
      const updatedAt = new Date(item.updated_at);
      if (!latest || updatedAt > latest) {
        return updatedAt;
      }
      return latest;
    }, null);

    return {
      total: items.length,
      sidebarCount,
      foundryCount,
      latestUpdated,
    };
  }, [items]);

  const resetForm = () => setForm(EMPTY_FORM);
  const closeFormDialog = () => {
    setIsFormOpen(false);
    resetForm();
  };
  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteConfirmation('');
  };
  const openCreateDialog = () => {
    resetForm();
    setIsFormOpen(true);
  };
  const isDeleteConfirmed =
    deleteTarget !== null && deleteConfirmation.trim() === deleteTarget.name;
  const openEditDialog = (catalogue: Catalogue) => {
    setForm({
      id: catalogue.id,
      name: catalogue.name,
      slug: catalogue.slug,
      description: catalogue.description || '',
      provider: catalogue.provider,
      project_endpoint: catalogue.provider_config?.project_endpoint || '',
      provider_agent_id: catalogue.provider_config?.agent_id || '',
      system_prompt: catalogue.system_prompt,
      agent_id: catalogue.agent_id || '',
      api_url: catalogue.api_url || '',
      agent_principal_id: catalogue.agent_principal_id || '',
      tenant_id: catalogue.tenant_id || '',
      activity_protocol_endpoint: catalogue.activity_protocol_endpoint || '',
      responses_api_endpoint: catalogue.responses_api_endpoint || '',
      show_in_sidebar: catalogue.show_in_sidebar,
    });
    setIsFormOpen(true);
  };
  const submitForm = () => {
    startTransition(async () => {
      const result = await upsertCatalogue({
        ...form,
        project_id: projectId,
        environment_id: environmentId,
        slug: form.slug || autoSlug(form.name),
        system_prompt:
          form.system_prompt ||
          `Use the ${form.name || 'catalogue'} endpoint to retrieve catalogue content.`,
        agent_id: form.provider_agent_id || form.agent_id,
      });

      if (!result.success) {
        toast(result.error.message || 'Failed to save catalogue.');
        return;
      }

      setItems((current) => {
        const existingIndex = current.findIndex(
          (item) => item.id === result.data.id,
        );

        if (existingIndex === -1) {
          return [result.data, ...current];
        }

        return current.map((item) =>
          item.id === result.data.id ? result.data : item,
        );
      });

      closeFormDialog();
      notifySidebarRefresh();
      toast(`Catalogue ${isEditing ? 'updated' : 'created'}.`);
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Catalogues
            </h2>
            <p className="text-sm text-muted-foreground">
              Ported from the donor implementation, now scoped to project and
              environment with Drizzle-backed versions.
            </p>
          </div>
          <Button onClick={openCreateDialog}>Add catalogue</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total catalogues
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.total}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              In sidebar
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.sidebarCount}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Foundry backed
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.foundryCount}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Latest update
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {overview.latestUpdated
                ? overview.latestUpdated.toLocaleString()
                : '-'}
            </p>
          </div>
        </div>

        {!items.length ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No catalogues configured for this environment.
          </div>
        ) : (
          items.map((catalogue) => (
            <div key={catalogue.id} className="rounded-lg border p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{catalogue.name}</h3>
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {catalogue.slug}
                    </code>
                    <Badge
                      variant="outline"
                      className={AI_PROVIDER_BADGE_STYLES[catalogue.provider]}
                    >
                      {getAiProviderLabel(catalogue.provider)}
                    </Badge>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/projects/${projectId}/ai/catalogues/${catalogue.id}?env=${environmentId}`}
                      >
                        Open
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(catalogue)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setDeleteTarget(catalogue);
                        setDeleteConfirmation('');
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {catalogue.description ? (
                    <p className="text-sm text-muted-foreground">
                      {catalogue.description}
                    </p>
                  ) : null}
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      Provider agent ID:{' '}
                      {catalogue.provider_config?.agent_id || '-'}
                    </div>
                    <div>Agent ID: {catalogue.agent_id || '-'}</div>
                    <div className="truncate">
                      Project endpoint:{' '}
                      {catalogue.provider_config?.project_endpoint || '-'}
                    </div>
                    <div>
                      Sidebar:{' '}
                      {catalogue.show_in_sidebar ? 'Visible' : 'Hidden'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 pt-2 sm:grid-cols-4">
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {catalogue.updated_at.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Provider
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {getAiProviderLabel(catalogue.provider)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Sidebar
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {catalogue.show_in_sidebar ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Slug
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {catalogue.slug}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeFormDialog();
          } else {
            setIsFormOpen(true);
          }
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>
              {isEditing ? 'Edit catalogue' : 'Add catalogue'}
            </DialogTitle>
            <DialogDescription>
              Keep the catalogue setup lightweight with only the fields needed
              to register and call the endpoint.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex max-h-[85vh] min-w-0 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              submitForm();
            }}
          >
            <div className="min-w-0 overflow-y-auto px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                        slug:
                          !current.slug ||
                          current.slug === autoSlug(current.name)
                            ? autoSlug(event.target.value)
                            : current.slug,
                      }))
                    }
                    placeholder="Product knowledge"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <TextArea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="What this catalogue is for"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: autoSlug(event.target.value),
                      }))
                    }
                    placeholder="product-knowledge"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Catalogues currently use a single slug rather than a
                    separate public endpoint slug.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">API URL</label>
                  <Input
                    type="url"
                    value={form.api_url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        api_url: event.target.value,
                      }))
                    }
                    placeholder="https://.../catalogues/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to call the catalogue endpoint when it differs from the
                    provider project endpoint.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select
                    value={form.provider}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        provider: value as AiProvider,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDER_OPTIONS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Project endpoint
                  </label>
                  <Input
                    type="url"
                    value={form.project_endpoint}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        project_endpoint: event.target.value,
                      }))
                    }
                    placeholder="https://.../api/projects/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent ID</label>
                  <Input
                    value={form.provider_agent_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        provider_agent_id: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Provider-specific settings are shown for the selected
                    provider. Microsoft Foundry currently requires a project
                    endpoint and an agent ID.
                  </p>
                </div>
              </div>
              <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>Add to demos sidebar</span>
                <Switch
                  checked={form.show_in_sidebar}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      show_in_sidebar: checked,
                    }))
                  }
                />
              </label>
            </div>
            <DialogFooter className="border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={closeFormDialog}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={submitForm}>
                {isEditing ? 'Save catalogue' : 'Create catalogue'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              catalogue and its saved versions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{' '}
              to confirm.
            </p>
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={deleteTarget?.name || 'Type catalogue name'}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              The name must match exactly, including spaces and capitalization.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={closeDeleteDialog}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !isDeleteConfirmed || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }

                const catalogueToDelete = deleteTarget;
                startTransition(async () => {
                  const result = await deleteCatalogue(
                    projectId,
                    catalogueToDelete.id,
                  );
                  if (!result.success) {
                    toast(
                      result.error.message || 'Failed to delete catalogue.',
                    );
                    return;
                  }
                  setItems((current) =>
                    current.filter((item) => item.id !== catalogueToDelete.id),
                  );
                  if (form.id === catalogueToDelete.id) {
                    closeFormDialog();
                  }
                  closeDeleteDialog();
                  notifySidebarRefresh();
                  toast('Catalogue deleted.');
                });
              }}
            >
              Delete catalogue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
