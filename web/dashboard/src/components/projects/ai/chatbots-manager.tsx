'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { MessageSquare } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { TextArea } from '@/components/ui/text-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  deleteChatbot,
  upsertChatbot,
  upsertChatbotApiSettings,
} from '@/data/ai/actions';
import { DEFAULT_CHATBOT_API_SETTINGS_VALUES } from '@/data/ai/chatbot-api-settings';
import type {
  Chatbot,
  ChatbotApiSettings,
  ChatbotApiSettingsInput,
  ChatbotStatsSummary,
} from '@/data/ai/dto';
import { AI_STATE_UPDATED_EVENT } from '@/lib/ai-events';
import { ChatbotApiSettingsSection } from '@/components/projects/ai/chatbot-api-settings-section';
import {
  AI_PROVIDER_BADGE_STYLES,
  AI_PROVIDER_OPTIONS,
  getAiProviderLabel,
  type AiProvider,
} from '@/data/ai/provider';

type ChatbotsManagerProps = {
  projectId: string;
  environmentId: string;
  chatbots: Chatbot[];
  stats: ChatbotStatsSummary[];
  apiSettings: ChatbotApiSettings[];
};

type ChatbotFormState = {
  id?: string;
  name: string;
  description: string;
  slug: string;
  public_slug: string;
  provider: AiProvider;
  project_endpoint: string;
  agent_id: string;
  enabled: boolean;
};

type ChatbotApiSettingsDraft = Omit<
  ChatbotApiSettingsInput,
  'project_id' | 'environment_id'
> & {
  id?: string;
};

const EMPTY_FORM: ChatbotFormState = {
  name: '',
  description: '',
  slug: '',
  public_slug: '',
  provider: 'microsoft-foundry',
  project_endpoint: '',
  agent_id: '',
  enabled: true,
};

function autoSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function notifyDemosSidebar() {
  window.dispatchEvent(new CustomEvent(AI_STATE_UPDATED_EVENT));
}

function buildPublicTalkEndpoint(publicSlug: string) {
  return publicSlug ? `/api/v1/chatbots/${publicSlug}/messages` : '';
}

export function ChatbotsManager({
  projectId,
  environmentId,
  chatbots,
  stats,
  apiSettings,
}: ChatbotsManagerProps) {
  const [items, setItems] = useState(chatbots);
  const [apiSettingsState, setApiSettingsState] = useState(apiSettings);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ChatbotFormState>(EMPTY_FORM);
  const [apiSettingsDraft, setApiSettingsDraft] =
    useState<ChatbotApiSettingsDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chatbot | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(form.id);

  const talkEndpoint = useMemo(
    () => buildPublicTalkEndpoint(form.public_slug),
    [form.public_slug],
  );

  const resetForm = () => setForm(EMPTY_FORM);
  const closeFormDialog = () => {
    setIsFormOpen(false);
    resetForm();
    setApiSettingsDraft(null);
  };
  const openCreateDialog = () => {
    resetForm();
    setApiSettingsDraft(null);
    setIsFormOpen(true);
  };
  const openEditDialog = (chatbot: Chatbot) => {
    setForm({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description || '',
      slug: chatbot.slug,
      public_slug: chatbot.public_slug,
      provider: chatbot.provider,
      project_endpoint: chatbot.project_endpoint,
      agent_id: chatbot.agent_id,
      enabled: chatbot.enabled,
    });
    const existingSettings = apiSettingsState.find(
      (settings) => settings.chatbot_id === chatbot.id,
    );
    setApiSettingsDraft({
      chatbot_id: chatbot.id,
      id: existingSettings?.id,
      rate_limit_enabled:
        existingSettings?.rate_limit_enabled ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.rate_limit_enabled,
      rate_limit_max_requests:
        existingSettings?.rate_limit_max_requests ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.rate_limit_max_requests,
      rate_limit_window_seconds:
        existingSettings?.rate_limit_window_seconds ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.rate_limit_window_seconds,
      rate_limit_use_ip:
        existingSettings?.rate_limit_use_ip ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.rate_limit_use_ip,
      rate_limit_use_session_cookie:
        existingSettings?.rate_limit_use_session_cookie ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.rate_limit_use_session_cookie,
      rate_limit_use_fingerprint:
        existingSettings?.rate_limit_use_fingerprint ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.rate_limit_use_fingerprint,
      fingerprint_header_name:
        existingSettings?.fingerprint_header_name ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.fingerprint_header_name,
      message_size_limit_enabled:
        existingSettings?.message_size_limit_enabled ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.message_size_limit_enabled,
      max_message_characters:
        existingSettings?.max_message_characters ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.max_message_characters,
      max_request_body_bytes:
        existingSettings?.max_request_body_bytes ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.max_request_body_bytes,
      session_request_cap_enabled:
        existingSettings?.session_request_cap_enabled ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.session_request_cap_enabled,
      session_request_cap_max_requests:
        existingSettings?.session_request_cap_max_requests ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.session_request_cap_max_requests,
      session_request_cap_window_seconds:
        existingSettings?.session_request_cap_window_seconds ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.session_request_cap_window_seconds,
      ip_daily_token_budget_enabled:
        existingSettings?.ip_daily_token_budget_enabled ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.ip_daily_token_budget_enabled,
      ip_daily_token_budget:
        existingSettings?.ip_daily_token_budget ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.ip_daily_token_budget,
      temporary_block_enabled:
        existingSettings?.temporary_block_enabled ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.temporary_block_enabled,
      temporary_block_violation_threshold:
        existingSettings?.temporary_block_violation_threshold ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.temporary_block_violation_threshold,
      temporary_block_window_seconds:
        existingSettings?.temporary_block_window_seconds ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.temporary_block_window_seconds,
      temporary_block_duration_seconds:
        existingSettings?.temporary_block_duration_seconds ??
        DEFAULT_CHATBOT_API_SETTINGS_VALUES.temporary_block_duration_seconds,
    });
    setIsFormOpen(true);
  };
  const submitForm = () => {
    startTransition(async () => {
      const result = await upsertChatbot({
        ...form,
        project_id: projectId,
        environment_id: environmentId,
        slug: form.slug || autoSlug(form.name),
        public_slug: form.public_slug || form.slug || autoSlug(form.name),
        provider: form.provider,
      });

      if (!result.success) {
        toast(result.error.message || 'Failed to save chatbot.');
        return;
      }

      if (isEditing && apiSettingsDraft) {
        const apiResult = await upsertChatbotApiSettings({
          ...apiSettingsDraft,
          chatbot_id: result.data.id,
          project_id: projectId,
          environment_id: environmentId,
        });
        if (!apiResult.success) {
          toast(
            apiResult.error.message || 'Failed to save chatbot API settings.',
          );
          return;
        }

        setApiSettingsState((current) => {
          const existingIndex = current.findIndex(
            (item) => item.chatbot_id === apiResult.data.chatbot_id,
          );
          if (existingIndex === -1) {
            return [apiResult.data, ...current];
          }
          return current.map((item) =>
            item.chatbot_id === apiResult.data.chatbot_id
              ? apiResult.data
              : item,
          );
        });
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
      notifyDemosSidebar();
      toast(`Chatbot ${isEditing ? 'updated' : 'created'}.`);
    });
  };
  const toggleChatbotEnabled = (chatbot: Chatbot, enabled: boolean) => {
    startTransition(async () => {
      const result = await upsertChatbot({
        id: chatbot.id,
        project_id: projectId,
        environment_id: environmentId,
        name: chatbot.name,
        description: chatbot.description,
        slug: chatbot.slug,
        public_slug: chatbot.public_slug,
        provider: chatbot.provider,
        project_endpoint: chatbot.project_endpoint,
        agent_id: chatbot.agent_id,
        enabled,
      });

      if (!result.success) {
        toast(result.error.message || 'Failed to update chatbot status.');
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === result.data.id ? result.data : item,
        ),
      );
      notifyDemosSidebar();
      toast(`Chatbot ${enabled ? 'enabled' : 'disabled'}.`);
    });
  };
  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteConfirmation('');
  };
  const statsMap = useMemo(
    () => new Map(stats.map((stat) => [stat.chatbot_id, stat])),
    [stats],
  );
  const isDeleteConfirmed =
    deleteTarget !== null && deleteConfirmation.trim() === deleteTarget.name;
  const overview = useMemo(() => {
    const requestCount = stats.reduce(
      (sum, stat) => sum + stat.request_count,
      0,
    );
    const successCount = stats.reduce(
      (sum, stat) => sum + stat.success_count,
      0,
    );
    const rateLimited = stats.reduce(
      (sum, stat) => sum + stat.rate_limited_count,
      0,
    );
    const avgLatency =
      stats.length > 0
        ? stats.reduce((sum, stat) => sum + stat.avg_latency_ms, 0) /
          stats.length
        : 0;

    return {
      requestCount,
      successRate: requestCount > 0 ? (successCount / requestCount) * 100 : 0,
      avgLatency,
      rateLimited,
    };
  }, [stats]);
  const currentApiProfile = useMemo(() => {
    if (!form.id) {
      return null;
    }

    return (
      apiSettingsDraft ??
      apiSettingsState.find((settings) => settings.chatbot_id === form.id) ?? {
        rate_limit_enabled: false,
        max_message_characters: 8000,
        max_request_body_bytes: 16000,
      }
    );
  }, [apiSettingsDraft, apiSettingsState, form.id]);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Registered chatbots
            </h2>
            <p className="text-sm text-muted-foreground">
              Each chatbot belongs to the selected environment and exposes a
              unique public talk endpoint.
            </p>
          </div>
          <Button onClick={openCreateDialog}>Add chatbot</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total requests
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.requestCount}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Success rate
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.successRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Avg latency
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.avgLatency > 0
                ? `${Math.round(overview.avgLatency)}ms`
                : '-'}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Rate limited
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.rateLimited}
            </p>
          </div>
        </div>

        {!items.length ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No chatbots configured for this environment yet.
          </div>
        ) : (
          items.map((chatbot) => (
            <div key={chatbot.id} className="rounded-lg border p-4">
              {(() => {
                const chatbotStat = statsMap.get(chatbot.id);
                return (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{chatbot.name}</h3>
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {chatbot.slug}
                        </code>
                        <Badge
                          variant="outline"
                          className={AI_PROVIDER_BADGE_STYLES[chatbot.provider]}
                        >
                          {getAiProviderLabel(chatbot.provider)}
                        </Badge>
                        <Badge
                          variant={chatbot.enabled ? 'default' : 'secondary'}
                        >
                          {chatbot.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <label className="flex items-center gap-2 py-1.5 text-sm">
                          <span>
                            {chatbot.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <Switch
                            checked={chatbot.enabled}
                            onCheckedChange={(enabled) =>
                              toggleChatbotEnabled(chatbot, enabled)
                            }
                            disabled={isPending}
                          />
                        </label>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/projects/${projectId}/demos/${chatbot.slug}?env=${environmentId}`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Open Chat
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(chatbot)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            setDeleteTarget(chatbot);
                            setDeleteConfirmation('');
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {chatbot.description ? (
                        <p className="text-sm text-muted-foreground">
                          {chatbot.description}
                        </p>
                      ) : null}
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>Agent ID: {chatbot.agent_id}</div>
                        <div>Public endpoint: {chatbot.public_slug}</div>
                        <div className="truncate">
                          Project endpoint: {chatbot.project_endpoint}
                        </div>
                        <div className="sm:col-span-2">
                          Talk API:{' '}
                          <code>
                            {buildPublicTalkEndpoint(chatbot.public_slug)}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 pt-2 sm:grid-cols-4">
                      <div className="rounded-lg border bg-muted/15 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Requests
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {chatbotStat?.request_count ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/15 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Success
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {chatbotStat
                            ? `${(chatbotStat.success_rate * 100).toFixed(1)}%`
                            : '-'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/15 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Latency
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {chatbotStat
                            ? `${Math.round(chatbotStat.avg_latency_ms)}ms`
                            : '-'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/15 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Last request
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {chatbotStat?.last_request_at
                            ? new Date(
                                chatbotStat.last_request_at,
                              ).toLocaleString()
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
        <DialogContent className="overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>
              {isEditing ? 'Edit chatbot' : 'Add chatbot'}
            </DialogTitle>
            <DialogDescription>
              Slug is generated from the name and shown in the endpoint preview.
              {isEditing && currentApiProfile ? (
                <span className="block pt-1">
                  Current profile:{' '}
                  {currentApiProfile.rate_limit_enabled
                    ? 'rate-limited'
                    : 'unthrottled'}{' '}
                  · max {currentApiProfile.max_message_characters} chars ·{' '}
                  {currentApiProfile.max_request_body_bytes} bytes
                </span>
              ) : null}
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
                        public_slug:
                          !current.public_slug ||
                          current.public_slug === autoSlug(current.name)
                            ? autoSlug(event.target.value)
                            : current.public_slug,
                      }))
                    }
                    placeholder="Global assistant"
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
                    placeholder="What this chatbot is for"
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
                    placeholder="global-assistant"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">
                    Public endpoint slug
                  </label>
                  <Input
                    value={form.public_slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        public_slug: autoSlug(event.target.value),
                      }))
                    }
                    placeholder="global-assistant"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This slug must be unique across all chatbots on the
                    platform.
                  </p>
                  {talkEndpoint ? (
                    <p className="text-xs text-muted-foreground">
                      Talk API: <code>{talkEndpoint}</code>
                    </p>
                  ) : null}
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
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent ID</label>
                  <Input
                    value={form.agent_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        agent_id: event.target.value,
                      }))
                    }
                    required
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

              {isEditing && form.id ? (
                <div className="flex flex-col gap-3">
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold">
                      Demo API protection
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure abuse protection, request caps, token budgets,
                      and temporary blocking for this chatbot.
                    </p>
                  </div>
                  <ChatbotApiSettingsSection
                    projectId={projectId}
                    environmentId={environmentId}
                    initialSettings={apiSettings.filter(
                      (settings) => settings.chatbot_id === form.id,
                    )}
                    chatbots={items
                      .filter((chatbot) => chatbot.id === form.id)
                      .map((chatbot) => ({
                        id: chatbot.id,
                        name: chatbot.name,
                        public_slug: chatbot.public_slug,
                      }))}
                    showChatbotSelector={false}
                    showSaveButton={false}
                    controlledSettings={apiSettingsDraft}
                    onControlledSettingsChange={setApiSettingsDraft}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Save the chatbot first, then reopen Edit to configure its demo
                  API protection.
                </div>
              )}
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={closeFormDialog}>
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={submitForm}>
                {isEditing ? 'Save chatbot' : 'Create chatbot'}
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
              chatbot and its public demo endpoint.
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
              placeholder={deleteTarget?.name || 'Type chatbot name'}
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

                const chatbotToDelete = deleteTarget;
                startTransition(async () => {
                  const result = await deleteChatbot(
                    projectId,
                    chatbotToDelete.id,
                  );
                  if (!result.success) {
                    toast(result.error.message || 'Failed to delete chatbot.');
                    return;
                  }

                  setItems((current) =>
                    current.filter((item) => item.id !== chatbotToDelete.id),
                  );
                  if (form.id === chatbotToDelete.id) {
                    closeFormDialog();
                  }
                  closeDeleteDialog();
                  notifyDemosSidebar();
                  toast('Chatbot deleted.');
                });
              }}
            >
              Delete chatbot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
