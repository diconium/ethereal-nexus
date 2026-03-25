import { notFound } from 'next/navigation';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getCatalogueById,
  getCatalogueDataOrEmpty,
  getProjectAiFlags,
  listCatalogueVersions,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { CatalogueEditor } from '@/components/projects/ai/catalogue-editor';

type PageProps = {
  params: Promise<{ id: string; catalogueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiCatalogueDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id, catalogueId } = await params;
  const query = await searchParams;
  const env = Array.isArray(query.env) ? query.env[0] : query.env;

  const [project, environments, catalogue, data, versions] = await Promise.all([
    getProjectById(id),
    getEnvironmentsByProject(id),
    getCatalogueById(id, catalogueId),
    getCatalogueDataOrEmpty(id, catalogueId),
    listCatalogueVersions(id, catalogueId),
  ]);

  if (!project.success) {
    notFound();
  }
  if (
    !environments.success ||
    !catalogue.success ||
    !data.success ||
    !versions.success
  ) {
    throw new Error('Failed to load catalogue detail.');
  }

  const selectedEnvironment =
    environments.data.find((environment) => environment.id === env) ||
    environments.data.find(
      (environment) => environment.id === catalogue.data.environment_id,
    ) ||
    environments.data[0];
  const flagsResult = selectedEnvironment
    ? await getProjectAiFlags(id, selectedEnvironment.id)
    : null;
  if (selectedEnvironment && (!flagsResult || !flagsResult.success)) {
    throw new Error('Failed to load catalogue detail.');
  }
  const flags = flagsResult?.success ? flagsResult.data : [];
  const featureFlag = flags.find((flag) => flag.key === 'catalogues');

  return (
    <div className="space-y-6">
      {!featureFlag?.enabled ? (
        <FeatureDisabledNotice
          projectId={id}
          title="Catalogues"
          environmentId={selectedEnvironment?.id}
        />
      ) : (
        <CatalogueEditor
          projectId={id}
          environmentId={
            selectedEnvironment?.id || catalogue.data.environment_id
          }
          catalogue={catalogue.data}
          initialData={data.data}
          versions={versions.data}
        />
      )}
    </div>
  );
}
