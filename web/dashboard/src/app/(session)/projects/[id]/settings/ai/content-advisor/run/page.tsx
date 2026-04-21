import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TextArea } from '@/components/ui/text-area';
import { ContentAdvisorManualRunControls } from '@/components/projects/ai/content-advisor-manual-run-controls';
import {
  getContentAdvisorAgentConfigs,
  getContentAdvisorRunDetails,
  getContentAdvisorScheduleById,
} from '@/data/ai/actions';
import { getProjectById } from '@/data/projects/actions';
import type {
  ContentAdvisorIssueWithComments,
} from '@/data/ai/dto';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

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

function IssuePreview({ issue }: { issue: ContentAdvisorIssueWithComments }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-foreground">{issue.title}</h3>
        <Badge variant={severityVariant(issue.severity)}>
          {issue.severity}
        </Badge>
        <Badge variant="outline">{statusLabel(issue.status)}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggestion
          </p>
          <p className="mt-1 text-sm text-foreground">{issue.suggestion}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reasoning
          </p>
          <p className="mt-1 text-sm text-foreground">{issue.reasoning}</p>
        </div>
      </div>
    </div>
  );
}

export default async function ContentAdvisorManualRunPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const env = getSingleParam(query.env);
  const scheduleId = getSingleParam(query.schedule);
  const selectedAgentId = getSingleParam(query.agent);
  const selectedPage = getSingleParam(query.page);
  const runId = getSingleParam(query.runId);

  if (!env || !scheduleId) {
    notFound();
  }

  const [projectResult, scheduleResult, agentsResult] = await Promise.all([
    getProjectById(id),
    getContentAdvisorScheduleById(id, scheduleId),
    getContentAdvisorAgentConfigs(id, env),
  ]);

  if (
    !projectResult.success ||
    !scheduleResult.success ||
    !agentsResult.success
  ) {
    notFound();
  }

  const project = projectResult.data;
  const schedule = scheduleResult.data;
  const enabledAgents = agentsResult.data.filter((agent) => agent.enabled);

  const defaultAgent =
    enabledAgents.find((agent) => agent.key === 'content') || enabledAgents[0];
  const activeAgentId = selectedAgentId || defaultAgent?.id || '';
  const activePage = selectedPage || schedule.pages[0] || '';

  const effectiveRunId = runId;

  const runDetails = effectiveRunId
    ? await getContentAdvisorRunDetails(id, effectiveRunId)
    : null;

  const backHref = `/projects/${id}/settings?section=ai&env=${env}`;
  const activeAgent = enabledAgents.find((agent) => agent.id === activeAgentId);
  const resolvedPageUrl =
    runDetails && runDetails.success && runDetails.data.issues[0]?.page_url
      ? runDetails.data.issues[0].page_url
      : activePage;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to AI settings
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Run Content Advisor Agent
            </h1>
            <p className="text-muted-foreground">
              Run one configured agent against one configured page and review
              the raw response before inspecting created issues.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{schedule.label}</CardTitle>
          <CardDescription>
            {project.name} · updated {formatDate(schedule.updated_at)}
          </CardDescription>
        </CardHeader>
        <CardContent
          className={
            activeAgent?.key === 'broken-link'
              ? 'space-y-4'
              : 'grid gap-4 lg:grid-cols-2'
          }
        >
          <ContentAdvisorManualRunControls
            projectId={id}
            environmentId={env}
            scheduleId={scheduleId}
            agents={enabledAgents}
            pages={schedule.pages}
            selectedAgentId={activeAgentId}
            selectedPage={activePage}
          />

          {activeAgent?.key !== 'broken-link' && (
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Current selection</p>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-foreground">Agent:</span>{' '}
                  <span className="text-muted-foreground">
                    {activeAgent?.name || 'No enabled agent available'}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-foreground">Page:</span>{' '}
                  <span className="break-all font-mono text-muted-foreground">
                    {activePage || 'No configured page available'}
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {runDetails && runDetails.success ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Agent response</CardTitle>
              <CardDescription>
                Review the raw response returned by the selected agent for the
                configured page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {runDetails.data.agentRuns.map((agentRun) => (
                <div
                  key={agentRun.id}
                  className="space-y-3 rounded-2xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {agentRun.agent.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {agentRun.summary}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {agentRun.issue_count} issue
                      {agentRun.issue_count === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <TextArea
                    readOnly
                    value={agentRun.response || 'No response captured.'}
                    rows={16}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Created issues</CardTitle>
              <CardDescription>
                Issues created from the latest run are stored automatically and
                become available in the Content Advisor issues view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {runDetails.data.issues.length ? (
                runDetails.data.issues.map((issue) => (
                  <IssuePreview key={issue.id} issue={issue} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No issues were created from this run.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Run summary
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {runDetails.data.run.summary}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Completed
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {formatDate(runDetails.data.run.completed_at)}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Issues created
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {runDetails.data.issues.length}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Target page
                </p>
                <p className="mt-2 break-all text-sm text-foreground">
                  {activePage}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/projects/${id}/ai/content-advisor?env=${env}`}>
                <MessageSquare className="size-4" />
                Open Content Advisor issues
              </Link>
            </Button>
            {resolvedPageUrl ? (
              <Button asChild variant="outline">
                <a
                  href={resolvedPageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLink className="size-4" />
                  Open resolved page
                </a>
              </Button>
            ) : null}
          </div>
        </>
      ) : effectiveRunId ? (
        <Card>
          <CardHeader>
            <CardTitle>Run details unavailable</CardTitle>
            <CardDescription>
              The run was executed, but its details could not be loaded.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ready to run</CardTitle>
            <CardDescription>
              Choose an agent and one of the configured pages, then run it to
              inspect the raw agent response and created issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-3 size-6" />
            No run executed yet for the current selection.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
