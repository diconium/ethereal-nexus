'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, X, Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  deletePageUrlMapping,
  upsertPageUrlMapping,
} from '@/data/ai/actions';
import type { PageUrlMapping } from '@/data/ai/dto';

type Props = {
  projectId: string;
  environmentId: string;
  initialMappings: PageUrlMapping[];
};

type EditState = {
  id?: string;
  aem_path: string;
  frontend_url: string;
};

const EMPTY_EDIT: EditState = { aem_path: '', frontend_url: '' };

export function PageUrlMappingsSection({
  projectId,
  environmentId,
  initialMappings,
}: Props) {
  const [mappings, setMappings] = useState<PageUrlMapping[]>(initialMappings);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT);
  const [isPending, startTransition] = useTransition();

  function startAdd() {
    setEditState(EMPTY_EDIT);
    setEditingId('new');
  }

  function startEdit(mapping: PageUrlMapping) {
    setEditState({
      id: mapping.id,
      aem_path: mapping.aem_path,
      frontend_url: mapping.frontend_url,
    });
    setEditingId(mapping.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(EMPTY_EDIT);
  }

  function handleSave() {
    const aemPath = editState.aem_path.trim();
    const frontendUrl = editState.frontend_url.trim();

    if (!aemPath.startsWith('/')) {
      toast('AEM path must start with /');
      return;
    }

    try {
      new URL(frontendUrl);
    } catch {
      toast('Enter a valid frontend URL (e.g. https://www.example.com/en/home)');
      return;
    }

    startTransition(async () => {
      const result = await upsertPageUrlMapping({
        id: editState.id,
        project_id: projectId,
        environment_id: environmentId,
        aem_path: aemPath,
        frontend_url: frontendUrl,
      });

      if (!result.success) {
        toast(result.error.message || 'Failed to save mapping.');
        return;
      }

      setMappings((prev) => {
        if (editState.id) {
          return prev.map((m) => (m.id === editState.id ? result.data : m));
        }
        return [...prev, result.data].sort((a, b) =>
          a.aem_path.localeCompare(b.aem_path),
        );
      });
      setEditingId(null);
      setEditState(EMPTY_EDIT);
      toast('Mapping saved.');
    });
  }

  function handleDelete(mappingId: string) {
    startTransition(async () => {
      const result = await deletePageUrlMapping(projectId, mappingId);
      if (!result.success) {
        toast(result.error.message || 'Failed to delete mapping.');
        return;
      }
      setMappings((prev) => prev.filter((m) => m.id !== mappingId));
      toast('Mapping deleted.');
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Map AEM content paths (e.g.{' '}
        <code className="rounded bg-muted px-1">/content/project/homepage</code>
        ) to their public frontend URLs. The broken-link crawler uses these
        mappings to resolve AEM paths to fetchable URLs at run time.
      </p>

      {mappings.length === 0 && editingId !== 'new' ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Link2 size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No URL mappings yet</p>
            <p className="text-xs text-muted-foreground">
              Add a mapping so the broken-link crawler can resolve AEM paths to
              real page URLs.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={startAdd}>
            <Plus size={14} className="mr-1" />
            Add mapping
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  AEM path
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Frontend URL
                </th>
                <th className="w-20 px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) =>
                editingId === mapping.id ? (
                  <tr key={mapping.id} className="border-b bg-muted/20">
                    <td className="px-3 py-2">
                      <Input
                        value={editState.aem_path}
                        onChange={(e) =>
                          setEditState((s) => ({
                            ...s,
                            aem_path: e.target.value,
                          }))
                        }
                        placeholder="/content/project/page"
                        disabled={isPending}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={editState.frontend_url}
                        onChange={(e) =>
                          setEditState((s) => ({
                            ...s,
                            frontend_url: e.target.value,
                          }))
                        }
                        placeholder="https://www.example.com/en/page"
                        disabled={isPending}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={handleSave}
                          disabled={isPending}
                          title="Save"
                        >
                          <Check size={13} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={cancelEdit}
                          disabled={isPending}
                          title="Cancel"
                        >
                          <X size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={mapping.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5">
                      <code className="text-xs">{mapping.aem_path}</code>
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={mapping.frontend_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline-offset-2 hover:underline truncate max-w-xs block"
                      >
                        {mapping.frontend_url}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEdit(mapping)}
                          disabled={isPending || editingId !== null}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(mapping.id)}
                          disabled={isPending || editingId !== null}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ),
              )}

              {editingId === 'new' && (
                <tr className="border-t bg-muted/20">
                  <td className="px-3 py-2">
                    <Input
                      value={editState.aem_path}
                      onChange={(e) =>
                        setEditState((s) => ({
                          ...s,
                          aem_path: e.target.value,
                        }))
                      }
                      placeholder="/content/project/page"
                      disabled={isPending}
                      className="h-8 text-xs"
                      autoFocus
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={editState.frontend_url}
                      onChange={(e) =>
                        setEditState((s) => ({
                          ...s,
                          frontend_url: e.target.value,
                        }))
                      }
                      placeholder="https://www.example.com/en/page"
                      disabled={isPending}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleSave}
                        disabled={isPending}
                        title="Save"
                      >
                        <Check size={13} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={cancelEdit}
                        disabled={isPending}
                        title="Cancel"
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {mappings.length > 0 && editingId !== 'new' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={startAdd}
            disabled={isPending || editingId !== null}
          >
            <Plus size={14} className="mr-1" />
            Add mapping
          </Button>
        </div>
      )}
    </div>
  );
}
