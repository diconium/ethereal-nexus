import { notFound } from 'next/navigation';
import { FolderTree } from 'lucide-react';
import { getProjectById } from '@/data/projects/actions';
import { ContentPlaceholder } from '@/components/projects/content/content-placeholder';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContentBrowserPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  return (
    <ContentPlaceholder
      title="Content Browser"
      description="Browse and inspect the content tree discovered from your CMS."
      icon={FolderTree}
    />
  );
}
