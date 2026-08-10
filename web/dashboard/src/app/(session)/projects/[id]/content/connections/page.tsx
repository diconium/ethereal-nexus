import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import { getCmsConnections } from '@/data/cms/actions';
import { CmsConnections } from '@/components/projects/content/cms-connections';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentConnectionsPage({
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

  const selectedEnvironment = environments.success
    ? environments.data.find((environment) => environment.id === env) ||
      environments.data[0]
    : undefined;

  const connections = await getCmsConnections(id);

  return (
    <CmsConnections
      projectId={id}
      environmentId={selectedEnvironment?.id ?? null}
      connections={connections.success ? connections.data : []}
    />
  );
}
