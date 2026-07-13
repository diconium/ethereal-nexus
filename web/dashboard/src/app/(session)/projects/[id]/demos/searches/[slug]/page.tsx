import { notFound } from 'next/navigation';
import {
  getProjectById,
  getEnvironmentsByProject,
} from '@/data/projects/actions';
import {
  getSearchAppsByEnvironment,
  getSearchAppApiSettingsByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';
import { SearchDemo } from '@/components/projects/demos/search-demo';

type PageProps = {
  params: Promise<{ id: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchDemoPage({
  params,
  searchParams,
}: PageProps) {
  const { id, slug } = await params;
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
        title="Unable to load search demo"
        message={environments.error.message}
      />
    );
  }

  const selectedEnvironment =
    environments.data.find((environment) => environment.id === env) ||
    environments.data[0];

  if (!selectedEnvironment) {
    return (
      <AiErrorNotice
        title="Unable to load search demo"
        message="Select an environment before opening a demo page."
      />
    );
  }

  const [flagsResult, searchAppsResult, apiSettingsResult] = await Promise.all([
    getProjectAiFlags(id, selectedEnvironment.id),
    getSearchAppsByEnvironment(id, selectedEnvironment.id),
    getSearchAppApiSettingsByEnvironment(id, selectedEnvironment.id),
  ]);

  if (
    !flagsResult.success ||
    !searchAppsResult.success ||
    !apiSettingsResult.success
  ) {
    return (
      <AiErrorNotice
        title="Unable to load search demo"
        message={
          !flagsResult.success
            ? flagsResult.error.message
            : !searchAppsResult.success
              ? searchAppsResult.error.message
              : !apiSettingsResult.success
                ? apiSettingsResult.error.message
                : 'Failed to load search demo.'
        }
      />
    );
  }

  const demosFlag = flagsResult.data.find((flag) => flag.key === 'demos');
  if (!demosFlag?.enabled) {
    return (
      <FeatureDisabledNotice
        projectId={id}
        title="Demos"
        environmentId={selectedEnvironment.id}
      />
    );
  }

  const searchApp = searchAppsResult.data.find((item) => item.slug === slug);
  if (!searchApp) {
    notFound();
  }

  const apiSettings = apiSettingsResult.data.find(
    (item) => item.search_app_id === searchApp.id,
  ) ?? {
    id: crypto.randomUUID(),
    project_id: id,
    environment_id: selectedEnvironment.id,
    search_app_id: searchApp.id,
    ...DEFAULT_SEARCH_APP_API_SETTINGS_VALUES,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return <SearchDemo searchApp={searchApp} apiSettings={apiSettings} />;
}
