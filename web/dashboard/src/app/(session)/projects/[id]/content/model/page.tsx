import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getProjectById } from '@/data/projects/actions';
import { getBlueprints } from '@/data/cms/actions';
import { getNexusLibrary } from '@/data/meta/design/actions';
import { getProjectMappingStats } from '@/data/meta/mapping/actions';
import { NexusLibraryExplorer } from '@/components/projects/content/nexus-library-explorer';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentModelPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id } = await params;
  const query = await searchParams;
  const env = Array.isArray(query.env) ? query.env[0] : query.env;

  const project = await getProjectById(id);
  if (!project.success) {
    notFound();
  }

  const [library, blueprints, stats] = await Promise.all([
    getNexusLibrary(id),
    getBlueprints(id),
    getProjectMappingStats(id),
  ]);

  if (!library.success) {
    notFound();
  }

  const mappedPercent = stats.success ? stats.data.percent : 0;

  const blueprintOptions = blueprints.success
    ? blueprints.data.map((b) => ({
        definitionId: b.definitionId,
        name: b.name,
      }))
    : [];

  return (
    <NexusLibraryExplorer
      library={library.data}
      projectId={id}
      blueprints={blueprintOptions}
      env={env ?? null}
      mappedPercent={mappedPercent}
    />
  );
}
