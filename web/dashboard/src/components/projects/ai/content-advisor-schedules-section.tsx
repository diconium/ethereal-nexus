'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
  type TransitionStartFunction,
} from 'react';
import {
  Check,
  ChevronDown,
  Clock3,
  FlaskConical,
  History,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  /** The allowed_domain configured on the Broken Link agent, if any. */
  brokenLinkDomain?: string;
};

type ScheduleFormState = {
  id?: string;
  label: string;
  urlInput: string;
  pages: string[];
  cron: string;
  enabled: boolean;
};

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

type ScheduleRowActionProps = {
  projectId: string;
  environmentId: string;
  schedule: ContentAdvisorSchedule;
  isPending: boolean;
  setNotice: (notice: Notice | null) => void;
  setSchedules: Dispatch<SetStateAction<ContentAdvisorSchedule[]>>;
  setFormMode: Dispatch<SetStateAction<null | 'new' | string>>;
  startTransition: TransitionStartFunction;
};

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Every weekday', value: '0 9 * * 1-5' },
] as const;

/**
 * Validates a 5-part cron expression (minute hour day month weekday).
 * Each part may be a number, range (1-5), step (star/slash), or wildcard.
 * This covers the common subset; does not validate field-value ranges.
 */
const CRON_PART = String.raw`(\*|(\d+(-\d+)?)(/\d+)?|\*/\d+)`;
const CRON_REGEX = new RegExp(
  `^${CRON_PART}\\s+${CRON_PART}\\s+${CRON_PART}\\s+${CRON_PART}\\s+${CRON_PART}$`,
);

function isValidCron(value: string): boolean {
  return CRON_REGEX.test(value.trim());
}

const BLANK_FORM: ScheduleFormState = {
  label: '',
  urlInput: '',
  pages: [],
  cron: '0 2 * * *',
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

  if (trimmed.startsWith('/')) {
    return trimmed;
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
  const [urlError, setUrlError] = useState<string | null>(null);

  const addPage = () => {
    const normalized = normalizeUrl(form.urlInput);
    if (!normalized) {
      setForm((current) => ({ ...current, urlInput: '' }));
      setUrlError(null);
      return;
    }

    if (form.pages.includes(normalized)) {
      setUrlError('This page has already been added.');
      return;
    }

    setUrlError(null);
    setForm((current) => ({
      ...current,
      urlInput: '',
      pages: [...current.pages, normalized],
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
            className={cn(
              'font-mono',
              !isValidCron(form.cron) &&
                form.cron &&
                'border-destructive focus-visible:ring-destructive',
            )}
          />
          {form.cron && !isValidCron(form.cron) ? (
            <p className="text-[11px] text-destructive">
              Invalid cron expression. Use 5-part format: minute hour day month
              weekday.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Standard 5-part cron: minute hour day month weekday.
            </p>
          )}
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
            onChange={(event) => {
              setUrlError(null);
              setForm((current) => ({
                ...current,
                urlInput: event.target.value,
              }));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addPage();
              }
            }}
            placeholder="https://example.com/page"
            className={
              urlError
                ? 'border-destructive focus-visible:ring-destructive'
                : undefined
            }
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
        {urlError ? (
          <p className="text-[11px] text-destructive">{urlError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add one or more page URLs. The Content Advisor and Broken Link
            crawler will use these as their starting points. The Broken Link
            crawler only follows links within the same domain as each page.
          </p>
        )}
      </div>

      <label className="flex items-center justify-between rounded-xl border bg-background px-4 py-3 text-sm">
        <div>
          <div className="font-medium text-foreground">Schedule state</div>
          <div className="text-xs text-muted-foreground">
            Disabled schedules stay saved but will not run until re-enabled.
          </div>
        </div>
        <div className="inline-flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {form.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={form.enabled}
            onCheckedChange={(checked) =>
              setForm((current) => ({ ...current, enabled: checked }))
            }
          />
        </div>
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="submit"
          disabled={
            saving || form.pages.length === 0 || !isValidCron(form.cron)
          }
        >
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

function ScheduleActions({
  projectId,
  environmentId,
  schedule,
  isPending,
  setNotice,
  setSchedules,
  setFormMode,
  startTransition,
}: ScheduleRowActionProps) {
  const router = useRouter();
  const historyHref = `/projects/${projectId}/ai/content-advisor/schedules/${schedule.id}/history?env=${environmentId}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Switch
        checked={schedule.enabled}
        disabled={isPending}
        aria-label={`${schedule.enabled ? 'Disable' : 'Enable'} schedule "${schedule.label}"`}
        onCheckedChange={(checked) => {
          startTransition(async () => {
            const result = await upsertContentAdvisorSchedule({
              id: schedule.id,
              project_id: projectId,
              environment_id: environmentId,
              label: schedule.label,
              cron: schedule.cron,
              enabled: checked,
              pages: schedule.pages,
            });

            if (!result.success) {
              setNotice({
                tone: 'error',
                message: result.error.message || 'Failed to toggle schedule.',
              });
              toast.error(result.error.message || 'Failed to toggle schedule.');
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
            toast.success(message);
          });
        }}
      />

      <Button asChild variant="outline" size="sm">
        <Link href={historyHref}>
          <History className="size-4" /> History
        </Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await runContentAdvisorScheduleAnalysis(
              projectId,
              schedule.id,
            );
            if (!result.success) {
              setNotice({
                tone: 'error',
                message: result.error.message || 'Failed to run schedule.',
              });
              toast.error(result.error.message || 'Failed to run schedule.');
              return;
            }

            const issueCount = result.data.issues.length;
            const message = issueCount
              ? `Run completed with ${issueCount} issue${issueCount === 1 ? '' : 's'}.`
              : 'Run completed with no issues.';

            setNotice({ tone: 'success', message });
            toast.success(message);
            router.refresh();
          });
        }}
      >
        {isPending ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Running...
          </>
        ) : (
          <>
            <Play className="size-4" /> Run now
          </>
        )}
      </Button>

      <Button asChild variant="outline" size="sm">
        <Link
          href={`/projects/${projectId}/settings/ai/content-advisor/run?env=${environmentId}&schedule=${schedule.id}`}
        >
          <FlaskConical className="size-4" /> Run agent
        </Link>
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

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the schedule &quot;{schedule.label}
              &quot; and all its configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                        result.error.message || 'Failed to delete schedule.',
                    });
                    toast.error(
                      result.error.message || 'Failed to delete schedule.',
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
                  toast.success('Schedule deleted.');
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScheduleDetailsRow({
  schedule,
  projectId,
  environmentId,
  isPending,
  setNotice,
  setSchedules,
  setFormMode,
  startTransition,
}: ScheduleRowActionProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b transition-colors hover:bg-muted/30">
        <div className="grid grid-cols-[40px_minmax(0,2fr)_100px_130px_90px_170px_minmax(280px,1fr)] items-center gap-2 px-4 py-3">
          <div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform',
                    open ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">
              {schedule.label}
            </div>
          </div>
          <div>
            <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
              {schedule.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="font-mono text-xs text-foreground">
            {schedule.cron}
          </div>
          <div className="text-sm text-foreground">
            {schedule.pages.length} page
            {schedule.pages.length === 1 ? '' : 's'}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(schedule.updated_at.toISOString())}
          </div>
          <ScheduleActions
            projectId={projectId}
            environmentId={environmentId}
            schedule={schedule}
            isPending={isPending}
            setNotice={setNotice}
            setSchedules={setSchedules}
            setFormMode={setFormMode}
            startTransition={startTransition}
          />
        </div>

        <CollapsibleContent className="border-t bg-muted/20 px-6 py-4">
          <div className="space-y-4">
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ContentAdvisorSchedulesSection({
  projectId,
  environmentId,
  initialSchedules,
  brokenLinkDomain,
}: Props) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [formMode, setFormMode] = useState<null | 'new' | string>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSchedules(initialSchedules);
    setNotice(null);
    setFormMode(null);
    // Only re-sync when the environment changes, not on every render caused by
    // a new initialSchedules reference (which would discard optimistic updates).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId]);

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
          enabled: editingSchedule.enabled,
        }
    : BLANK_FORM;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Create reusable page analysis jobs for this environment. Each
            schedule defines the pages to inspect and the cron cadence. The
            Broken Link crawler uses the crawl depth configured on the agent
            itself.
          </p>
          {brokenLinkDomain ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Broken Link crawler restricted to</span>
              <Badge
                variant="outline"
                className="font-mono text-[11px] text-foreground"
              >
                {brokenLinkDomain}
              </Badge>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={() => {
            setFormMode('new');
            setNotice(null);
          }}
          disabled={formMode !== null}
          title={
            formMode !== null
              ? 'Finish editing the current schedule first'
              : undefined
          }
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
                enabled: form.enabled,
                pages: form.pages,
              });

              if (!result.success) {
                setNotice({
                  tone: 'error',
                  message: result.error.message || 'Failed to save schedule.',
                });
                toast.error(result.error.message || 'Failed to save schedule.');
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
              toast.success(
                form.id ? 'Schedule updated.' : 'Schedule created.',
              );
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
              {brokenLinkDomain ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  The Broken Link crawler will be restricted to{' '}
                  <span className="font-mono font-medium text-foreground">
                    {brokenLinkDomain}
                  </span>
                  .
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="grid grid-cols-[40px_minmax(0,2fr)_100px_130px_90px_170px_minmax(280px,1fr)] gap-2 border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div />
            <div>Schedule</div>
            <div>Status</div>
            <div>Cron</div>
            <div>Pages</div>
            <div>Updated</div>
            <div className="text-right">Actions</div>
          </div>

          <div>
            {schedules.map((schedule) => (
              <ScheduleDetailsRow
                key={schedule.id}
                schedule={schedule}
                projectId={projectId}
                environmentId={environmentId}
                isPending={isPending}
                setNotice={setNotice}
                setSchedules={setSchedules}
                setFormMode={setFormMode}
                startTransition={startTransition}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
