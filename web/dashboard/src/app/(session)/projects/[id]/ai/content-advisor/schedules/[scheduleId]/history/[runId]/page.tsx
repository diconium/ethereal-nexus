import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  CircleAlert,
  Clock,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  getContentAdvisorRunDetails,
  getContentAdvisorScheduleById,
} from '@/data/ai/actions';
import { getProjectById } from '@/data/projects/actions';
import type {
  ContentAdvisorAgentRunWithAgent,
  ContentAdvisorIssueWithComments,
} from '@/data/ai/dto';
import {
  formatDate,
  formatDuration,
  getSingleParam,
  RunStatusBadge,
  TriggerBadge,
} from '../_components/shared';

type PageProps = {
  params: Promise<{ id: string; scheduleId: string; runId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function severityVariant(value: string) {
  if (value === 'critical') return 'destructive' as const;
  if (value === 'warning') return 'warning' as const;
  return 'outline' as const;
}

function statusLabel(value: string) {
  switch (value) {
    case 'open':
      return 'To do';
    case 'in-progress':
      return 'In progress';
    case 'done':
      return 'Done';
    case 'wont-do':
      return "Won't do";
    default:
      return value;
  }
}

function AgentRunCard({
  agentRun,
  issues,
}: {
  agentRun: ContentAdvisorAgentRunWithAgent;
  issues: ContentAdvisorIssueWithComments[];
}) {
  const agentIssues = issues.filter(
    (issue) => issue.agent_run_id === agentRun.id,
  );

  return (
    <div className="rounded-2xl border">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="size-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {agentRun.agent.name}
            </span>
            <Badge variant="outline" className="text-[11px]">
              {agentRun.agent.key}
            </Badge>
            <RunStatusBadge status={agentRun.status} />
          </div>
          {agentRun.summary ? (
            <p className="text-sm text-muted-foreground">{agentRun.summary}</p>
          ) : null}
        </div>
        <Badge variant={agentIssues.length > 0 ? 'destructive' : 'outline'}>
          {agentIssues.length} issue{agentIssues.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {agentIssues.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3 px-5 py-4">
            {agentIssues.map((issue) => (
              <div key={issue.id} className="rounded-xl border bg-muted/10 p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CircleAlert className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {issue.title}
                      </span>
                      <Badge variant={severityVariant(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <Badge variant="outline">
                        {statusLabel(issue.status)}
                      </Badge>
                      <Badge variant="outline">
                        {issue.issue_type.replace(/-/g, ' ')}
                      </Badge>
                    </div>

                    {(issue.page_path || issue.page_url) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {issue.page_path || issue.page_url}
                        </span>
                        {issue.page_url.startsWith('http') && (
                          <a
                            href={issue.page_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      {issue.description}
                    </p>

                    <div className="grid gap-3 pt-1 md:grid-cols-2">
                      <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                          <Lightbulb className="size-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Suggestion
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {issue.suggestion}
                        </p>
                      </div>

                      <div className="space-y-1 rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Brain className="size-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Reasoning
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {issue.reasoning}
                        </p>
                      </div>
                    </div>

                    {(issue.component_path || issue.page_path) && (
                      <div className="rounded-lg border border-dashed bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
                        {issue.page_path && (
                          <p>
                            Page path:{' '}
                            <span className="font-mono text-foreground">
                              {issue.page_path}
                            </span>
                          </p>
                        )}
                        {issue.component_path && (
                          <p className={issue.page_path ? 'mt-1' : ''}>
                            Component path:{' '}
                            <span className="font-mono text-foreground">
                              {issue.component_path}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="border-t px-5 py-4 text-sm text-muted-foreground">
          No issues found by this agent in this run.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ContentAdvisorRunDetailPage({
  params,
  searchParams,
}: PageProps) {
  noStore();

  const { id, scheduleId, runId } = await params;
  const query = await searchParams;
  const env = getSingleParam(query.env);

  const [projectResult, scheduleResult, runDetailsResult] = await Promise.all([
    getProjectById(id),
    getContentAdvisorScheduleById(id, scheduleId),
    getContentAdvisorRunDetails(id, runId),
  ]);

  if (!projectResult.success) {
    notFound();
  }
  if (!scheduleResult.success) {
    notFound();
  }
  if (!runDetailsResult.success) {
    if (runDetailsResult.error?.message?.toLowerCase().includes('not found'))
      notFound();
    throw new Error(
      runDetailsResult.error?.message ?? 'Failed to load run details.',
    );
  }

  const project = projectResult.data;
  const schedule = scheduleResult.data;
  const { run, agentRuns, issues } = runDetailsResult.data;

  // Ownership check: the run must belong to this schedule
  if (run.schedule_id !== scheduleId) {
    notFound();
  }

  const safeEnv = env ? encodeURIComponent(env) : undefined;

  const historyHref = safeEnv
    ? `/projects/${id}/ai/content-advisor/schedules/${scheduleId}/history?env=${safeEnv}`
    : `/projects/${id}/ai/content-advisor/schedules/${scheduleId}/history`;

  const issuesHref = safeEnv
    ? `/projects/${id}/ai/content-advisor?env=${safeEnv}`
    : `/projects/${id}/ai/content-advisor`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href={historyHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to run history
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Run details
            </h1>
            <p className="mt-1 text-muted-foreground">
              {formatDate(run.created_at)} &mdash;{' '}
              <span className="font-medium text-foreground">
                {schedule.label}
              </span>{' '}
              &mdash; {project.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RunStatusBadge status={run.status} />
            <TriggerBadge triggeredBy={run.triggered_by} />
            <Button asChild variant="outline" size="sm">
              <Link href={issuesHref}>
                <CircleAlert className="size-4" />
                View all issues
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Run metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Run summary</CardTitle>
          <CardDescription>
            {run.summary ||
              (run.status === 'failed'
                ? 'This run failed before a summary could be generated.'
                : 'No summary available.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Started
              </p>
              <p className="mt-2 text-sm text-foreground">
                {formatDate(run.created_at)}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Completed
              </p>
              <p className="mt-2 text-sm text-foreground">
                {formatDate(run.completed_at)}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Duration
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                <Clock className="size-3.5 text-muted-foreground" />
                {formatDuration(run.created_at, run.completed_at)}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total issues
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                {issues.length > 0 ? (
                  <CircleAlert className="size-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
                {issues.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages analysed */}
      <Card>
        <CardHeader>
          <CardTitle>Pages analysed</CardTitle>
          <CardDescription>
            The pages that were scanned during this run.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {schedule.pages.map((page) => (
              <div
                key={page}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/20 px-3 py-1 text-[11px] font-mono text-foreground"
              >
                {page}
                {page.startsWith('http') ? (
                  <a
                    href={page}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span
                    className="opacity-30 cursor-default"
                    aria-hidden="true"
                  >
                    <ExternalLink className="size-3" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent run breakdown */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Agent results</h2>
          <p className="text-sm text-muted-foreground">
            Breakdown of each agent&apos;s findings for this run.
          </p>
        </div>

        {agentRuns.length ? (
          agentRuns.map((agentRun) => (
            <AgentRunCard
              key={agentRun.id}
              agentRun={agentRun}
              issues={issues}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No agent runs recorded for this run.
          </div>
        )}
      </div>
    </div>
  );
}
