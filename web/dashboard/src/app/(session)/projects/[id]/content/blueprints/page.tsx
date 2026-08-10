import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getProjectById } from '@/data/projects/actions';
import { getBlueprints, getCmsConnections } from '@/data/cms/actions';
import { BlueprintsDashboard } from '@/components/projects/content/blueprints-dashboard';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentBlueprintsPage({
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

  const [blueprints, connections] = await Promise.all([
    getBlueprints(id),
    getCmsConnections(id),
  ]);

  return (
    <BlueprintsDashboard
      blueprints={blueprints.success ? blueprints.data : []}
      projectId={id}
      env={env ?? null}
      connectedCms={connections.success ? connections.data.length : 0}
    />
  );
}
