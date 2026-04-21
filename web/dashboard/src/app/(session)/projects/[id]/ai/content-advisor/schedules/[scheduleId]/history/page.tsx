import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  ArrowLeft,
  Bot,
  Calendar,
  ChevronRight,
  CircleAlert,
  Clock3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  getContentAdvisorRunsForSchedule,
  getContentAdvisorScheduleById,
} from '@/data/ai/actions';
import { getProjectById } from '@/data/projects/actions';
import type { ContentAdvisorRunHistoryItem } from '@/data/ai/dto';
import {
  formatDate,
  formatDuration,
  getSingleParam,
  RunStatusBadge,
  TriggerBadge,
} from './_components/shared';

type PageProps = {
  params: Promise<{ id: string; scheduleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function RunRow({
  run,
  href,
}: {
  run: ContentAdvisorRunHistoryItem;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`View details for run on ${formatDate(run.created_at)}`}
      className="flex items-start justify-between gap-4 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1 space-y-2">
        {/* Status + trigger + issue count */}
        <div className="flex flex-wrap items-center gap-2">
          <RunStatusBadge status={run.status} />
          <TriggerBadge triggeredBy={run.triggered_by} />
          {run.issue_count > 0 ? (
            <Badge variant="destructive" className="text-[11px]">
              {run.issue_count} issue{run.issue_count === 1 ? '' : 's'}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-300"
            >
              No issues
            </Badge>
          )}
        </div>

        {/* Date + duration */}
        <p className="text-sm font-medium text-foreground">
          {formatDate(run.created_at)}
          <span className="ml-3 text-xs font-normal text-muted-foreground">
            {formatDuration(run.created_at, run.completed_at)}
          </span>
        </p>

        {/* Agent type badges */}
        {run.agentRuns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {run.agentRuns.map((agentRun) => (
              <Badge
                key={agentRun.id}
                variant="outline"
                className="gap-1 text-[11px]"
              >
                <Bot className="size-3" />
                {agentRun.agent.name}
                {agentRun.issue_count > 0 ? (
                  <span className="ml-0.5 rounded-full bg-destructive/15 px-1 text-destructive">
                    {agentRun.issue_count}
                  </span>
                ) : null}
              </Badge>
            ))}
          </div>
        )}

        {run.summary ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {run.summary}
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ContentAdvisorScheduleHistoryPage({
  params,
  searchParams,
}: PageProps) {
  noStore();

  const { id, scheduleId } = await params;
  const query = await searchParams;
  const env = getSingleParam(query.env);

  const [projectResult, scheduleResult, runsResult] = await Promise.all([
    getProjectById(id),
    getContentAdvisorScheduleById(id, scheduleId),
    getContentAdvisorRunsForSchedule(id, scheduleId),
  ]);

  if (!projectResult.success) {
    notFound();
  }
  if (!scheduleResult.success) {
    notFound();
  }
  if (!runsResult.success) {
    throw new Error(runsResult.error?.message ?? 'Failed to load runs.');
  }

  const project = projectResult.data;
  const schedule = scheduleResult.data;
  const runs = runsResult.data;

  const safeEnv = env ? encodeURIComponent(env) : undefined;

  const backHref = safeEnv
    ? `/projects/${id}/settings?section=ai&env=${safeEnv}`
    : `/projects/${id}/settings?section=ai`;

  const issuesHref = safeEnv
    ? `/projects/${id}/ai/content-advisor?env=${safeEnv}`
    : `/projects/${id}/ai/content-advisor`;

  function runDetailHref(runId: string) {
    const base = `/projects/${id}/ai/content-advisor/schedules/${scheduleId}/history/${runId}`;
    return safeEnv ? `${base}?env=${safeEnv}` : base;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to AI settings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Run history
            </h1>
            <p className="mt-1 text-muted-foreground">
              Past runs for{' '}
              <span className="font-medium text-foreground">
                {schedule.label}
              </span>{' '}
              &mdash; {project.name}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={issuesHref}>
              <CircleAlert className="size-4" />
              View all issues
            </Link>
          </Button>
        </div>

        {/* Schedule meta strip */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock3 className="size-4" />
            <span className="font-mono">{schedule.cron}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-4" />
            <span>
              {schedule.pages.length} page
              {schedule.pages.length === 1 ? '' : 's'}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
            {schedule.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </div>

      {/* Run list */}
      {!runs.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Clock3 className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">No runs yet</p>
              <p className="text-sm text-muted-foreground">
                This schedule has not been executed yet. Use{' '}
                <strong>Run now</strong> on the settings page to trigger the
                first run.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {runs.length} run{runs.length === 1 ? '' : 's'}
          </p>
          <div className="overflow-hidden rounded-xl border">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} href={runDetailHref(run.id)} />
            ))}
          </div>
          {runs.length >= 25 && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Showing the 25 most recent runs. Older runs are not displayed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
