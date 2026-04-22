'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { buildSuggestions } from '@ethereal-nexus/dialog-ui-core';
import { Bot, History, Loader2, Send, Trash2, Undo2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/text-area';
import { toast } from 'sonner';
import { deleteAuthorDialog, upsertAuthorDialog } from '@/data/ai/actions';
import type { AuthorDialog } from '@/data/ai/dto';
import {
  sampleAuthorDialogDefinition,
  sampleAuthorValues,
} from '@/data/ai/sample-author-data';
import { useAuthorChat } from './author/use-author-chat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AI_PROVIDER_BADGE_STYLES,
  AI_PROVIDER_OPTIONS,
  getAiProviderLabel,
  type AiProvider,
} from '@/data/ai/provider';

type AuthorDialogsWorkspaceProps = {
  projectId: string;
  environmentId: string;
  dialogs: AuthorDialog[];
};

type WorkspaceFormState = {
  id?: string;
  name: string;
  description: string;
  slug: string;
  public_slug: string;
  provider: AiProvider;
  project_endpoint: string;
  provider_agent_id: string;
  system_prompt: string;
  enabled: boolean;
};

const EMPTY_WORKSPACE_FORM: WorkspaceFormState = {
  name: 'New Author Workspace',
  description: '',
  slug: '',
  public_slug: '',
  provider: 'microsoft-foundry',
  project_endpoint: '',
  provider_agent_id: '',
  system_prompt:
    'You help authors edit structured dialog values. Be concise, explain the change, and return updated JSON when values should change.',
  enabled: true,
};

export function AuthorDialogsWorkspace({
  projectId,
  environmentId,
  dialogs,
}: AuthorDialogsWorkspaceProps) {
  const [dialogsState, setDialogsState] = useState(dialogs);
  const [selectedId, setSelectedId] = useState(dialogs[0]?.id || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<WorkspaceFormState>(EMPTY_WORKSPACE_FORM);
  const selectedDialog =
    dialogsState.find((dialog) => dialog.id === selectedId) || dialogsState[0];

  const [dialogJson] = useState(
    JSON.stringify(sampleAuthorDialogDefinition, null, 2),
  );
  const [valuesJson, setValuesJson] = useState(
    JSON.stringify(sampleAuthorValues, null, 2),
  );
  const [workspaceName, setWorkspaceName] = useState(
    selectedDialog?.name || '',
  );
  const [workspaceDescription, setWorkspaceDescription] = useState(
    selectedDialog?.description || '',
  );
  const [systemPrompt, setSystemPrompt] = useState(
    selectedDialog?.system_prompt || '',
  );
  const [provider, setProvider] = useState<AiProvider>(
    selectedDialog?.provider || 'microsoft-foundry',
  );
  const [publicSlug, setPublicSlug] = useState(
    selectedDialog?.public_slug || selectedDialog?.slug || '',
  );
  const [projectEndpoint, setProjectEndpoint] = useState(
    selectedDialog?.provider_config?.project_endpoint || '',
  );
  const [providerAgentId, setProviderAgentId] = useState(
    selectedDialog?.provider_config?.agent_id || '',
  );
  const [input, setInput] = useState('');
  const [previousValuesJson, setPreviousValuesJson] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AuthorDialog | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();
  const dialogJsonRef = useRef(dialogJson);
  const valuesJsonRef = useRef(valuesJson);

  useEffect(() => {
    dialogJsonRef.current = dialogJson;
  }, [dialogJson]);

  useEffect(() => {
    valuesJsonRef.current = valuesJson;
  }, [valuesJson]);

  useEffect(() => {
    if (!selectedDialog) {
      return;
    }
    setValuesJson(JSON.stringify(sampleAuthorValues, null, 2));
    setWorkspaceName(selectedDialog.name || '');
    setWorkspaceDescription(selectedDialog.description || '');
    setSystemPrompt(selectedDialog.system_prompt || '');
    setProvider(selectedDialog.provider || 'microsoft-foundry');
    setPublicSlug(selectedDialog.public_slug || selectedDialog.slug || '');
    setProjectEndpoint(selectedDialog.provider_config?.project_endpoint || '');
    setProviderAgentId(selectedDialog.provider_config?.agent_id || '');
    setPreviousValuesJson(null);
  }, [selectedDialog]);

  const apiUrl = `/api/v1/projects/${projectId}/environments/${environmentId}/author/chat`;
  const publicApiUrl = publicSlug
    ? `/api/v1/author-dialogs/${publicSlug}/messages`
    : '/api/v1/author-dialogs/<public-slug>/messages';
  const isEditing = Boolean(form.id);
  const isDeleteConfirmed =
    deleteTarget !== null && deleteConfirmation.trim() === deleteTarget.name;
  const overview = useMemo(() => {
    const enabledCount = dialogsState.filter((dialog) => dialog.enabled).length;
    const publicCount = dialogsState.filter(
      (dialog) => dialog.public_slug,
    ).length;
    const latestUpdated = dialogsState.reduce<Date | null>((latest, dialog) => {
      const updatedAt = new Date(dialog.updated_at);
      if (!latest || updatedAt > latest) {
        return updatedAt;
      }
      return latest;
    }, null);

    return {
      total: dialogsState.length,
      enabledCount,
      publicCount,
      latestUpdated,
    };
  }, [dialogsState]);
  const suggestions = useMemo(() => {
    try {
      return buildSuggestions(JSON.parse(dialogJson));
    } catch {
      return [];
    }
  }, [dialogJson]);

  const {
    messages,
    isStreaming,
    error,
    requestHistory,
    clearConversation,
    sendMessage,
  } = useAuthorChat({
    getDialogJson: () => dialogJsonRef.current,
    getValuesJson: () => valuesJsonRef.current,
    onValuesUpdate: (nextValue) => {
      setPreviousValuesJson(valuesJsonRef.current);
      setValuesJson(nextValue);
    },
    apiUrl,
    authorDialogId: selectedDialog?.id || '',
  });

  const resetForm = () => setForm(EMPTY_WORKSPACE_FORM);

  const openCreateDialog = () => {
    const timestamp = Date.now();
    setForm({
      ...EMPTY_WORKSPACE_FORM,
      slug: `author-workspace-${timestamp}`,
      public_slug: `author-workspace-${timestamp}`,
    });
    setIsFormOpen(true);
  };

  const openEditDialog = (dialog: AuthorDialog) => {
    const isCurrent = selectedDialog?.id === dialog.id;
    setForm({
      id: dialog.id,
      name: isCurrent ? workspaceName : dialog.name,
      description: isCurrent ? workspaceDescription : dialog.description || '',
      slug: dialog.slug,
      public_slug: isCurrent
        ? publicSlug
        : dialog.public_slug || dialog.slug || '',
      provider: isCurrent ? provider : dialog.provider,
      project_endpoint: isCurrent
        ? projectEndpoint
        : dialog.provider_config?.project_endpoint || '',
      provider_agent_id: isCurrent
        ? providerAgentId
        : dialog.provider_config?.agent_id || '',
      system_prompt: isCurrent ? systemPrompt : dialog.system_prompt,
      enabled: dialog.enabled,
    });
    setIsFormOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const submitForm = () => {
    startTransition(async () => {
      const result = await upsertAuthorDialog({
        id: form.id,
        project_id: projectId,
        environment_id: environmentId,
        name: form.name,
        description: form.description,
        slug: form.slug,
        public_slug: form.public_slug,
        provider: form.provider,
        project_endpoint: form.project_endpoint,
        provider_agent_id: form.provider_agent_id,
        system_prompt: form.system_prompt,
        enabled: form.enabled,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to save workspace.');
        return;
      }

      setDialogsState((current) => {
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
      setSelectedId(result.data.id);
      closeFormDialog();
      toast(`Workspace ${isEditing ? 'updated' : 'created'}.`);
    });
  };

  const removeWorkspace = (dialog: AuthorDialog) => {
    setDeleteTarget(dialog);
    setDeleteConfirmation('');
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteConfirmation('');
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Author workspaces
            </h2>
            <p className="text-sm text-muted-foreground">
              Environment-scoped author dialog workspaces with configurable
              public endpoints and live editing tools.
            </p>
          </div>
          <Button size="sm" disabled={isPending} onClick={openCreateDialog}>
            Add new
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total workspaces
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.total}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Enabled
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.enabledCount}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Public endpoints
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.publicCount}
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

        {!dialogsState.length ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Author dialog chat is unavailable for this environment until you add
            a workspace.
          </div>
        ) : (
          dialogsState.map((dialog) => (
            <div key={dialog.id} className="rounded-lg border p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{dialog.name}</h3>
                    <Badge
                      variant="outline"
                      className={AI_PROVIDER_BADGE_STYLES[dialog.provider]}
                    >
                      {getAiProviderLabel(dialog.provider)}
                    </Badge>
                    {dialog.id === selectedDialog?.id ? (
                      <Badge variant="outline">Selected</Badge>
                    ) : null}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Button
                      variant={
                        dialog.id === selectedDialog?.id ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setSelectedId(dialog.id)}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => openEditDialog(dialog)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => removeWorkspace(dialog)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {dialog.description ? (
                    <p className="text-sm text-muted-foreground">
                      {dialog.description}
                    </p>
                  ) : null}
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      Agent ID: {dialog.provider_config?.agent_id || '-'}
                    </div>
                    <div>Public endpoint: {dialog.public_slug || '-'}</div>
                    <div className="truncate">
                      Project endpoint:{' '}
                      {dialog.provider_config?.project_endpoint || '-'}
                    </div>
                    <div className="sm:col-span-2">
                      API:{' '}
                      <code>{`/api/v1/author-dialogs/${dialog.public_slug || '<public-slug>'}/messages`}</code>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 pt-2 sm:grid-cols-4">
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {dialog.enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Provider
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {getAiProviderLabel(dialog.provider)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {dialog.updated_at.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/15 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Workspace name
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {dialog.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {!selectedDialog ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add a new author workspace to enable the author dialog chat and debug
          state panels.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Debug state</CardTitle>
                <CardDescription>
                  Review the active dialog definition and current values used by
                  the author workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Dialog definition JSON
                    </label>
                    <Status valid={isValidJson(dialogJson)} />
                  </div>
                  <textarea
                    value={dialogJson}
                    readOnly
                    spellCheck={false}
                    className="min-h-[260px] w-full rounded-md border bg-muted/30 p-3 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Values JSON</label>
                    <Status valid={isValidJson(valuesJson)} />
                  </div>
                  <textarea
                    value={valuesJson}
                    readOnly
                    spellCheck={false}
                    className="min-h-[220px] w-full rounded-md border bg-muted/30 p-3 font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="size-5" /> Author dialog chat
                    </CardTitle>
                    <CardDescription>
                      Use the current dialog definition and values as context
                      for the authoring conversation.
                    </CardDescription>
                  </div>
                  {messages.length ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearConversation}
                    >
                      <Trash2 className="mr-2 size-4" /> Clear
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!messages.length ? (
                  <div className="space-y-4 rounded-lg border border-dashed p-6">
                    <p className="text-sm text-muted-foreground">
                      Start with a prompt or use one of the donor-style
                      suggestions.
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {previousValuesJson ? (
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => {
                            setValuesJson(previousValuesJson);
                            setPreviousValuesJson(null);
                          }}
                        >
                          <Undo2 className="mr-2 size-4" /> Undo last change
                        </Button>
                      ) : null}
                      {suggestions.map((suggestion: string) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          className="justify-start whitespace-normal h-auto py-3"
                          onClick={() => sendMessage(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Bot className="size-4" />
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-muted/30'}`}
                        >
                          {message.role === 'assistant' ? (
                            message.content ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />{' '}
                                Thinking...
                              </div>
                            )
                          ) : (
                            <span className="whitespace-pre-wrap">
                              {message.content}
                            </span>
                          )}
                        </div>
                        {message.role === 'user' ? (
                          <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <User className="size-4" />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {error ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="rounded-2xl border bg-background px-4 py-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          if (!input.trim()) {
                            return;
                          }
                          setPreviousValuesJson(null);
                          sendMessage(input);
                          setInput('');
                        }
                      }}
                      rows={1}
                      placeholder="Describe the content update you want to make..."
                      className="min-h-[28px] max-h-[180px] w-full resize-none bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      The request history stays visible so obsolete or broken
                      flows are easier to spot.
                    </p>
                    <Button
                      disabled={!input.trim() || isStreaming || !selectedDialog}
                      onClick={() => {
                        if (!input.trim()) {
                          return;
                        }
                        setPreviousValuesJson(null);
                        sendMessage(input);
                        setInput('');
                      }}
                    >
                      {isStreaming ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 size-4" />
                      )}
                      Send
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <History className="size-4" /> Request history
                  </div>
                  <div className="space-y-2">
                    {!requestHistory.length ? (
                      <p className="text-sm text-muted-foreground">
                        No requests yet.
                      </p>
                    ) : (
                      requestHistory.map((entry) => (
                        <details
                          key={entry.id}
                          className="rounded-md border p-3"
                        >
                          <summary className="cursor-pointer text-sm font-medium">
                            {entry.timestamp} · {entry.durationMs}ms
                          </summary>
                          <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted/30 p-3 text-xs">
                            {JSON.stringify(entry.requestBody, null, 2)}
                          </pre>
                          {entry.response ? (
                            <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted/30 p-3 text-xs">
                              {JSON.stringify(entry.response, null, 2)}
                            </pre>
                          ) : null}
                          {entry.error ? (
                            <p className="mt-3 text-sm text-destructive">
                              {entry.error}
                            </p>
                          ) : null}
                        </details>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit workspace' : 'Add workspace'}
            </DialogTitle>
            <DialogDescription>
              Configure the author workspace and its public endpoint settings.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitForm();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace name</label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Author workspace"
                required
              />
            </div>
            <div className="space-y-2">
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
                placeholder="What this author workspace is for"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Workspace slug</label>
                <Input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="author-workspace"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Public endpoint slug
                </label>
                <Input
                  value={form.public_slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      public_slug: event.target.value,
                    }))
                  }
                  placeholder="author-workspace"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This slug must be unique across all author dialog endpoints.
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
                    {AI_PROVIDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project endpoint</label>
                <Input
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">System prompt</label>
              <TextArea
                value={form.system_prompt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    system_prompt: event.target.value,
                  }))
                }
                rows={5}
              />
            </div>

            <DialogFooter>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={closeFormDialog}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={isPending}
                onClick={submitForm}
              >
                {isEditing ? 'Save workspace' : 'Create workspace'}
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
              author workspace and its configured public endpoint.
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
              placeholder={deleteTarget?.name || 'Type workspace name'}
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

                const workspaceToDelete = deleteTarget;
                startTransition(async () => {
                  const result = await deleteAuthorDialog(
                    projectId,
                    workspaceToDelete.id,
                  );
                  if (!result.success) {
                    toast(
                      result.error.message || 'Failed to delete workspace.',
                    );
                    return;
                  }

                  setDialogsState((current) => {
                    const next = current.filter(
                      (item) => item.id !== workspaceToDelete.id,
                    );
                    setSelectedId(next[0]?.id || '');
                    return next;
                  });
                  clearConversation();
                  closeDeleteDialog();
                  toast('Workspace deleted.');
                });
              }}
            >
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isValidJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function Status({ valid }: { valid: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs ${valid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}
    >
      {valid ? 'Valid' : 'Invalid'}
    </span>
  );
}
