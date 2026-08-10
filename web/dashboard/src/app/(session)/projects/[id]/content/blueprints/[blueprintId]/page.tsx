import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getProjectById } from '@/data/projects/actions';
import { getBlueprintDetail } from '@/data/cms/actions';
import { BlueprintDetailView } from '@/components/projects/content/blueprint-detail';

type PageProps = {
  params: Promise<{ id: string; blueprintId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BlueprintDetailPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id, blueprintId } = await params;
  const query = await searchParams;
  const env = Array.isArray(query.env) ? query.env[0] : query.env;

  const project = await getProjectById(id);
  if (!project.success) {
    notFound();
  }

  const blueprint = await getBlueprintDetail(blueprintId);
  if (!blueprint.success) {
    notFound();
  }

  const projectHref = `/projects/${id}/content/blueprints${env ? `?env=${env}` : ''}`;

  return (
    <BlueprintDetailView blueprint={blueprint.data} projectHref={projectHref} />
  );
}
