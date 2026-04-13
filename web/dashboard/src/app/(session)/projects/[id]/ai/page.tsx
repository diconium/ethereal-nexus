import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getProjectById,
  getEnvironmentsByProject,
} from '@/data/projects/actions';
import {
  getChatbotsByEnvironment,
  getContentAdvisorAgentConfigs,
  getContentAdvisorIssuesDashboard,
  getContentAdvisorSchedules,
  getLatestContentAdvisorResult,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { ProjectAiOverview } from '@/components/projects/ai/project-ai-overview';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id } = await params;
  const query = await searchParams;
  const env = Array.isArray(query.env) ? query.env[0] : query.env;

  const [project, environments] = await Promise.all([
    getProjectById(id),
    getEnvironmentsByProject(id),
  ]);

  if (!project.success) {
    notFound();
  }

  if (!environments.success) {
    const message = environments.error.message;

    return (
      <AiErrorNotice title="Unable to load AI overview" message={message} />
    );
  }

  const selectedEnvironment =
    environments.data.find((environment) => environment.id === env) ||
    environments.data[0];
  const flagsResult = selectedEnvironment
    ? await getProjectAiFlags(id, selectedEnvironment.id)
    : null;
  if (selectedEnvironment && (!flagsResult || !flagsResult.success)) {
    return (
      <AiErrorNotice
        title="Unable to load AI overview"
        message={
          flagsResult?.success
            ? 'Failed to load AI overview.'
            : (flagsResult?.error.message ?? 'Failed to load AI overview.')
        }
      />
    );
  }

  const [
    allEnvironmentChatbots,
    environmentAgentConfigs,
    environmentSchedules,
    latestContentAdvisorResult,
    contentAdvisorIssuesDashboard,
  ] = selectedEnvironment
    ? await Promise.all([
        Promise.all(
          environments.data.map((environment) =>
            getChatbotsByEnvironment(id, environment.id),
          ),
        ),
        getContentAdvisorAgentConfigs(id, selectedEnvironment.id),
        getContentAdvisorSchedules(id, selectedEnvironment.id),
        getLatestContentAdvisorResult(id, selectedEnvironment.id),
        getContentAdvisorIssuesDashboard(id, selectedEnvironment.id),
      ])
    : [[], null, null, null, null];

  const totalChatbots = Array.isArray(allEnvironmentChatbots)
    ? allEnvironmentChatbots.reduce(
        (sum, result) => sum + (result.success ? result.data.length : 0),
        0,
      )
    : 0;

  const activeFeatures = (flagsResult?.success ? flagsResult.data : []).filter(
    (flag) => flag.enabled,
  ).length;

  const topPerformingAgent =
    contentAdvisorIssuesDashboard && contentAdvisorIssuesDashboard.success
      ? (() => {
          const issueCounts = new Map<string, { name: string; count: number }>();
          for (const issue of contentAdvisorIssuesDashboard.data.issues) {
            const current = issueCounts.get(issue.agent.key) || {
              name: issue.agent.name,
              count: 0,
            };
            current.count += issue.detection_count || 1;
            issueCounts.set(issue.agent.key, current);
          }

          return (
            Array.from(issueCounts.values()).sort((a, b) => b.count - a.count)[0]
              ?.name || 'No agent data yet'
          );
        })()
      : 'No agent data yet';

  const contentIssuesFound =
    latestContentAdvisorResult && latestContentAdvisorResult.success
      ? latestContentAdvisorResult.data.issues.length
      : 0;

  const scheduledRuns =
    environmentSchedules && environmentSchedules.success
      ? environmentSchedules.data.filter((schedule) => schedule.enabled).length
      : 0;

  const contentAdvisorResolvedRate =
    contentAdvisorIssuesDashboard && contentAdvisorIssuesDashboard.success
      ? (() => {
          const issues = contentAdvisorIssuesDashboard.data.issues;
          if (!issues.length) {
            return 0;
          }

          const resolved = issues.filter(
            (issue) => issue.status === 'done' || issue.status === 'wont-do',
          ).length;
          return Math.round((resolved / issues.length) * 100);
        })()
      : 0;

  const persistentIssues =
    contentAdvisorIssuesDashboard && contentAdvisorIssuesDashboard.success
      ? contentAdvisorIssuesDashboard.data.issues.length
      : 0;

  const openIssues =
    contentAdvisorIssuesDashboard && contentAdvisorIssuesDashboard.success
      ? contentAdvisorIssuesDashboard.data.issues.filter(
          (issue) => issue.status === 'open' || issue.status === 'in-progress',
        ).length
      : 0;

  const enabledAgents =
    environmentAgentConfigs && environmentAgentConfigs.success
      ? environmentAgentConfigs.data.filter((agent) => agent.enabled).length
      : 0;

  const systemActivityPoints =
    contentAdvisorIssuesDashboard && contentAdvisorIssuesDashboard.success
      ? (() => {
          const formatter = new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
          });
          const points = Array.from({ length: 7 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            const key = date.toISOString().slice(0, 10);
            return {
              day: formatter.format(date),
              key,
              detections: 0,
            };
          });

          for (const issue of contentAdvisorIssuesDashboard.data.issues) {
            for (const detection of issue.detections) {
              const key = new Date(detection.created_at)
                .toISOString()
                .slice(0, 10);
              const point = points.find((entry) => entry.key === key);
              if (point) {
                point.detections += 1;
              }
            }
          }

          return points.map(({ day, detections }) => ({ day, detections }));
        })()
      : [];

  return (
    <div className="space-y-6">
      <ProjectAiOverview
        projectId={id}
        environmentId={selectedEnvironment?.id}
        flags={flagsResult?.success ? flagsResult.data : []}
        stats={{
          activeFeatures,
          totalChatbots,
          contentIssuesFound,
          scheduledRuns,
          topPerformingAgent,
          contentAdvisorResolvedRate,
          persistentIssues,
          openIssues,
          enabledAgents,
          systemActivityPoints,
        }}
      />
    </div>
  );
}
