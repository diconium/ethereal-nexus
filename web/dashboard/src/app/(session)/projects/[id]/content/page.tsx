import { notFound } from 'next/navigation';
import { getProjectById } from '@/data/projects/actions';
import { ContentMigrationOverview } from '@/components/projects/content/content-migration-overview';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectContentOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  return <ContentMigrationOverview projectName={project.data.name} />;
}
