import { notFound } from 'next/navigation';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getCataloguesByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';
import { CatalogueDemo } from '@/components/projects/demos/catalogue-demo';

type PageProps = {
  params: Promise<{ id: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogueDemoPage({
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
        title="Unable to load catalogue demo"
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
        title="Unable to load catalogue demo"
        message="Select an environment before opening a demo page."
      />
    );
  }

  const [flagsResult, cataloguesResult] = await Promise.all([
    getProjectAiFlags(id, selectedEnvironment.id),
    getCataloguesByEnvironment(id, selectedEnvironment.id),
  ]);

  if (!flagsResult.success || !cataloguesResult.success) {
    return (
      <AiErrorNotice
        title="Unable to load catalogue demo"
        message={
          !flagsResult.success
            ? flagsResult.error.message
            : !cataloguesResult.success
              ? cataloguesResult.error.message
              : 'Failed to load catalogue demo.'
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

  const catalogue = cataloguesResult.data.find((item) => item.slug === slug);
  if (!catalogue) {
    notFound();
  }

  return (
    <CatalogueDemo
      projectId={id}
      environmentId={selectedEnvironment.id}
      catalogue={catalogue}
    />
  );
}
