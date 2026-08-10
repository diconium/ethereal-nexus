import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getProjectById } from '@/data/projects/actions';
import { getProvisionJob } from '@/data/meta/provision/actions';
import { MigrationJobDetail } from '@/components/projects/content/migration-job-detail';

type PageProps = {
  params: Promise<{ id: string; jobId: string }>;
};

export default async function ContentMigrationJobDetailPage({
  params,
}: PageProps) {
  noStore();
  const { id, jobId } = await params;
  const project = await getProjectById(id);
  if (!project.success) {
    notFound();
  }

  const job = await getProvisionJob(jobId);
  if (!job.success) {
    notFound();
  }

  return <MigrationJobDetail projectId={id} initialJob={job.data} />;
}
