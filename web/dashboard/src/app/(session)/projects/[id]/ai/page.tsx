import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getProjectById,
  getEnvironmentsByProject,
} from '@/data/projects/actions';
import {
  getChatbotsByEnvironment,
  getContentAdvisorAgentConfigs,
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
      ])
    : [[], null, null, null];

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
    environmentAgentConfigs && environmentAgentConfigs.success
      ? environmentAgentConfigs.data.find((agent) => agent.enabled)?.name ||
        'SEO & Performance'
      : 'SEO & Performance';

  const contentIssuesFound =
    latestContentAdvisorResult && latestContentAdvisorResult.success
      ? latestContentAdvisorResult.data.issues.length
      : 0;

  const scheduledRuns =
    environmentSchedules && environmentSchedules.success
      ? environmentSchedules.data.filter((schedule) => schedule.enabled).length
      : 0;

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
        }}
      />
    </div>
  );
}
