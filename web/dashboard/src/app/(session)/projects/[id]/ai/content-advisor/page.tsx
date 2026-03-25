import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getContentAdvisorAgentConfigs,
  getContentAdvisorSchedules,
  getLatestContentAdvisorResult,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { ContentAdvisorManager } from '@/components/projects/ai/content-advisor-manager';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiContentAdvisorPage({
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
      <AiErrorNotice title="Unable to load Content Advisor" message={message} />
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
        title="Unable to load Content Advisor"
        message={
          flagsResult?.success
            ? 'Failed to load Content Advisor.'
            : (flagsResult?.error.message ?? 'Failed to load Content Advisor.')
        }
      />
    );
  }
  const flags = flagsResult?.success ? flagsResult.data : [];
  const featureFlag = flags.find((flag) => flag.key === 'content-advisor');

  const [agents, schedules, latestResult] = selectedEnvironment
    ? await Promise.all([
        getContentAdvisorAgentConfigs(id, selectedEnvironment.id),
        getContentAdvisorSchedules(id, selectedEnvironment.id),
        getLatestContentAdvisorResult(id, selectedEnvironment.id),
      ])
    : [null, null, null];

  return (
    <div className="space-y-6">
      {!featureFlag?.enabled ? (
        <FeatureDisabledNotice
          projectId={id}
          title="Content Advisor"
          environmentId={selectedEnvironment?.id}
        />
      ) : !selectedEnvironment ? (
        <FeatureDisabledNotice projectId={id} title="Content Advisor" />
      ) : agents?.success && schedules?.success && latestResult?.success ? (
        <ContentAdvisorManager
          projectId={id}
          environmentId={selectedEnvironment.id}
          agents={agents.data}
          schedules={schedules.data}
          issues={latestResult.data.issues}
          runSummary={latestResult.data.run?.summary}
        />
      ) : (
        <AiErrorNotice
          title="Unable to load Content Advisor"
          message={
            agents && !agents.success
              ? agents.error.message
              : schedules && !schedules.success
                ? schedules.error.message
                : latestResult && !latestResult.success
                  ? latestResult.error.message
                  : 'Unable to load content advisor for this environment.'
          }
        />
      )}
    </div>
  );
}
