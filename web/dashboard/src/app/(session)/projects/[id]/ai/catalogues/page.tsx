import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getCataloguesByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { CataloguesManager } from '@/components/projects/ai/catalogues-manager';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiCataloguesPage({
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
      <AiErrorNotice title="Unable to load AI catalogues" message={message} />
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
        title="Unable to load AI catalogues"
        message={
          flagsResult?.success
            ? 'Failed to load AI catalogues.'
            : (flagsResult?.error.message ?? 'Failed to load AI catalogues.')
        }
      />
    );
  }
  const flags = flagsResult?.success ? flagsResult.data : [];
  const featureFlag = flags.find((flag) => flag.key === 'catalogues');
  const catalogues = selectedEnvironment
    ? await getCataloguesByEnvironment(id, selectedEnvironment.id)
    : null;

  return (
    <div className="space-y-6">
      {!featureFlag?.enabled ? (
        <FeatureDisabledNotice
          projectId={id}
          title="Catalogues"
          environmentId={selectedEnvironment?.id}
        />
      ) : !selectedEnvironment ? (
        <FeatureDisabledNotice projectId={id} title="Catalogues" />
      ) : catalogues?.success ? (
        <CataloguesManager
          projectId={id}
          environmentId={selectedEnvironment.id}
          catalogues={catalogues.data}
        />
      ) : (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Unable to load catalogues for this environment.
        </div>
      )}
    </div>
  );
}
