import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getProjectById } from '@/data/projects/actions';
import { getProvisionJobs } from '@/data/meta/provision/actions';
import { MigrationJobsList } from '@/components/projects/content/migration-jobs-list';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContentMigrationJobsPage({ params }: PageProps) {
  noStore();
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  const jobs = await getProvisionJobs(id);

  return (
    <MigrationJobsList projectId={id} jobs={jobs.success ? jobs.data : []} />
  );
}
