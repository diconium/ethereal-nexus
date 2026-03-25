'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Check,
  Clock3,
  Pencil,
  Play,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/text-area';
import {
  deleteContentAdvisorSchedule,
  runContentAdvisorScheduleAnalysis,
  upsertContentAdvisorSchedule,
} from '@/data/ai/actions';
import type { ContentAdvisorSchedule } from '@/data/ai/dto';
import { cn } from '@/lib/utils';

type Props = {
  projectId: string;
  environmentId: string;
  initialSchedules: ContentAdvisorSchedule[];
};

type ScheduleFormState = {
  id?: string;
  label: string;
  urlInput: string;
  pages: string[];
  cron: string;
  focus_instruction: string;
  enabled: boolean;
};

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Every weekday', value: '0 9 * * 1-5' },
] as const;

const BLANK_FORM: ScheduleFormState = {
  label: '',
  urlInput: '',
  pages: [],
  cron: '0 2 * * *',
  focus_instruction: '',
  enabled: true,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function ScheduleForm({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: ScheduleFormState;
  saving: boolean;
  onCancel: () => void;
  onSave: (form: ScheduleFormState) => void;
}) {
  const [form, setForm] = useState<ScheduleFormState>(initial);

  const addPage = () => {
    const normalized = normalizeUrl(form.urlInput);
    if (!normalized) {
      setForm((current) => ({ ...current, urlInput: '' }));
      return;
    }

    setForm((current) => ({
      ...current,
      urlInput: '',
      pages: current.pages.includes(normalized)
        ? current.pages
        : [...current.pages, normalized],
    }));
  };

  return (
    <form
      className="space-y-5 rounded-2xl border border-primary/15 bg-muted/20 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {form.id ? 'Edit schedule' : 'New schedule'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure when the advisor runs and which pages it should inspect
            for the current environment.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {form.cron}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Label
          </label>
          <Input
            required
            placeholder="Homepage daily quality review"
            value={form.label}
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cron expression
          </label>
          <Input
            required
            value={form.cron}
            onChange={(event) =>
              setForm((current) => ({ ...current, cron: event.target.value }))
            }
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Standard 5-part cron: minute hour day month weekday.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() =>
                setForm((current) => ({ ...current, cron: preset.value }))
              }
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                form.cron === preset.value
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pages to analyse
        </label>
        {form.pages.length ? (
          <div className="flex flex-wrap gap-2">
            {form.pages.map((page) => (
              <span
                key={page}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-[11px] font-mono text-foreground"
              >
                <span className="max-w-[28rem] truncate">{page}</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      pages: current.pages.filter((value) => value !== page),
                    }))
                  }
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={form.urlInput}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                urlInput: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addPage();
              }
            }}
            placeholder="https://example.com/page"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addPage}
            disabled={!form.urlInput.trim()}
          >
            <Plus className="size-4" /> Add page
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Add one or more page URLs. Content Advisor schedules are page-based
          only.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Focus instruction
          <span className="ml-1 font-normal normal-case text-muted-foreground">
            (optional)
          </span>
        </label>
        <TextArea
          rows={3}
          value={form.focus_instruction}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              focus_instruction: event.target.value,
            }))
          }
          placeholder="Prioritise stale content and broken journeys on these pages."
        />
      </div>

      <label className="flex items-center justify-between rounded-xl border bg-background px-4 py-3 text-sm">
        <div>
          <div className="font-medium text-foreground">Schedule state</div>
          <div className="text-xs text-muted-foreground">
            Disabled schedules stay saved but will not run until re-enabled.
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setForm((current) => ({ ...current, enabled: !current.enabled }))
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {form.enabled ? (
            <ToggleRight className="size-6 text-primary" />
          ) : (
            <ToggleLeft className="size-6 text-muted-foreground" />
          )}
          {form.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={saving || form.pages.length === 0}>
          <Check className="size-4" />
          {saving ? 'Saving...' : 'Save schedule'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="size-4" /> Cancel
        </Button>
      </div>
    </form>
  );
}

export function ContentAdvisorSchedulesSection({
  projectId,
  environmentId,
  initialSchedules,
}: Props) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [formMode, setFormMode] = useState<null | 'new' | string>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSchedules(initialSchedules);
    setNotice(null);
    setFormMode(null);
  }, [environmentId, initialSchedules]);

  const editingSchedule = useMemo(
    () =>
      typeof formMode === 'string' && formMode !== 'new'
        ? schedules.find((schedule) => schedule.id === formMode)
        : undefined,
    [formMode, schedules],
  );

  const initialForm = editingSchedule
    ? {
        id: editingSchedule.id,
        label: editingSchedule.label,
        urlInput: '',
        pages: editingSchedule.pages,
        cron: editingSchedule.cron,
        focus_instruction: editingSchedule.focus_instruction || '',
        enabled: editingSchedule.enabled,
      }
    : BLANK_FORM;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Create reusable page analysis jobs for this environment and run them
          manually when needed.
        </p>
        <Button
          type="button"
          onClick={() => {
            setFormMode('new');
            setNotice(null);
          }}
          disabled={formMode !== null}
        >
          <Plus className="size-4" /> New schedule
        </Button>
      </div>

      {notice ? (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            notice.tone === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/20 bg-destructive/10 text-destructive',
          )}
        >
          {notice.message}
        </div>
      ) : null}

      {formMode ? (
        <ScheduleForm
          initial={initialForm}
          saving={isPending}
          onCancel={() => setFormMode(null)}
          onSave={(form) => {
            startTransition(async () => {
              const result = await upsertContentAdvisorSchedule({
                id: form.id,
                project_id: projectId,
                environment_id: environmentId,
                label: form.label,
                cron: form.cron,
                focus_instruction: form.focus_instruction || null,
                enabled: form.enabled,
                pages: form.pages,
              });

              if (!result.success) {
                setNotice({
                  tone: 'error',
                  message: result.error.message || 'Failed to save schedule.',
                });
                toast(result.error.message || 'Failed to save schedule.');
                return;
              }

              setSchedules((current) => {
                const exists = current.some(
                  (item) => item.id === result.data.id,
                );
                return exists
                  ? current.map((item) =>
                      item.id === result.data.id ? result.data : item,
                    )
                  : [result.data, ...current];
              });
              setFormMode(null);
              setNotice({
                tone: 'success',
                message: form.id ? 'Schedule updated.' : 'Schedule created.',
              });
              toast(form.id ? 'Schedule updated.' : 'Schedule created.');
            });
          }}
        />
      ) : null}

      {!schedules.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock3 className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">No schedules yet</p>
              <p className="text-sm text-muted-foreground">
                Create a schedule to automate page reviews for the selected
                environment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {schedule.label}
                      </CardTitle>
                      <Badge
                        variant={schedule.enabled ? 'default' : 'secondary'}
                      >
                        {schedule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px]"
                      >
                        {schedule.cron}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {schedule.pages.length} page
                      {schedule.pages.length === 1 ? '' : 's'} configured ·
                      updated {formatDate(schedule.updated_at.toISOString())}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result =
                            await runContentAdvisorScheduleAnalysis(
                              projectId,
                              schedule.id,
                            );
                          if (!result.success) {
                            setNotice({
                              tone: 'error',
                              message:
                                result.error.message ||
                                'Failed to run schedule.',
                            });
                            toast(
                              result.error.message || 'Failed to run schedule.',
                            );
                            return;
                          }

                          const issueCount = result.data.issues.length;
                          const message = issueCount
                            ? `Run completed with ${issueCount} issue${issueCount === 1 ? '' : 's'}.`
                            : 'Run completed with no issues.';

                          setNotice({ tone: 'success', message });
                          toast(message);
                        });
                      }}
                    >
                      <Play className="size-4" /> Run now
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setFormMode(schedule.id);
                        setNotice(null);
                      }}
                    >
                      <Pencil className="size-4" /> Edit
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await upsertContentAdvisorSchedule({
                            id: schedule.id,
                            project_id: projectId,
                            environment_id: environmentId,
                            label: schedule.label,
                            cron: schedule.cron,
                            focus_instruction:
                              schedule.focus_instruction || null,
                            enabled: !schedule.enabled,
                            pages: schedule.pages,
                          });

                          if (!result.success) {
                            setNotice({
                              tone: 'error',
                              message:
                                result.error.message ||
                                'Failed to toggle schedule.',
                            });
                            toast(
                              result.error.message ||
                                'Failed to toggle schedule.',
                            );
                            return;
                          }

                          setSchedules((current) =>
                            current.map((item) =>
                              item.id === result.data.id ? result.data : item,
                            ),
                          );
                          const message = result.data.enabled
                            ? 'Schedule enabled.'
                            : 'Schedule disabled.';
                          setNotice({ tone: 'success', message });
                          toast(message);
                        });
                      }}
                    >
                      {schedule.enabled ? (
                        <ToggleRight className="size-4 text-primary" />
                      ) : (
                        <ToggleLeft className="size-4 text-muted-foreground" />
                      )}
                      {schedule.enabled ? 'Disable' : 'Enable'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteContentAdvisorSchedule(
                            projectId,
                            schedule.id,
                          );
                          if (!result.success) {
                            setNotice({
                              tone: 'error',
                              message:
                                result.error.message ||
                                'Failed to delete schedule.',
                            });
                            toast(
                              result.error.message ||
                                'Failed to delete schedule.',
                            );
                            return;
                          }

                          setSchedules((current) =>
                            current.filter((item) => item.id !== schedule.id),
                          );
                          setNotice({
                            tone: 'success',
                            message: 'Schedule deleted.',
                          });
                          toast('Schedule deleted.');
                        });
                      }}
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {schedule.focus_instruction ? (
                  <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    {schedule.focus_instruction}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Configured pages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {schedule.pages.map((page) => (
                      <span
                        key={page}
                        className="inline-flex rounded-full border bg-background px-3 py-1 text-[11px] font-mono text-foreground"
                      >
                        {page}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
