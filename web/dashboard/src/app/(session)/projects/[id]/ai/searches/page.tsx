import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getSearchAppsByEnvironment,
  getSearchAppApiSettingsByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { SearchesManager } from '@/components/projects/ai/searches-manager';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiSearchesPage({
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
    return (
      <AiErrorNotice
        title="Unable to load AI searches"
        message={environments.error.message}
      />
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
        title="Unable to load AI searches"
        message={
          flagsResult?.success
            ? 'Failed to load AI searches.'
            : (flagsResult?.error.message ?? 'Failed to load AI searches.')
        }
      />
    );
  }

  const flags = flagsResult?.success ? flagsResult.data : [];
  const searchesFlag = flags.find((flag) => flag.key === 'searches');

  const [searchApps, searchAppApiSettings] = selectedEnvironment
    ? await Promise.all([
        getSearchAppsByEnvironment(id, selectedEnvironment.id),
        getSearchAppApiSettingsByEnvironment(id, selectedEnvironment.id),
      ])
    : [null, null];

  return (
    <div className="space-y-6">
      {!searchesFlag?.enabled ? (
        <FeatureDisabledNotice
          projectId={id}
          title="Search Applications"
          environmentId={selectedEnvironment?.id}
        />
      ) : !selectedEnvironment ? (
        <FeatureDisabledNotice projectId={id} title="Search Applications" />
      ) : searchApps?.success && searchAppApiSettings?.success ? (
        <SearchesManager
          projectId={id}
          environmentId={selectedEnvironment.id}
          searchApps={searchApps.data}
          apiSettings={searchAppApiSettings.data}
        />
      ) : (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Unable to load search applications for this environment.
        </div>
      )}
    </div>
  );
}
