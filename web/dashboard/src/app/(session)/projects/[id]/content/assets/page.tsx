import { notFound } from 'next/navigation';
import { Images } from 'lucide-react';
import { getProjectById } from '@/data/projects/actions';
import { ContentPlaceholder } from '@/components/projects/content/content-placeholder';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContentAssetsPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  return (
    <ContentPlaceholder
      title="Assets"
      description="Browse and manage assets indexed from your source CMS."
      icon={Images}
    />
  );
}
