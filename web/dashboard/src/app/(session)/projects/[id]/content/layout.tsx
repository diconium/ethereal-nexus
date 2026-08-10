import { getProjectById } from '@/data/projects/actions';
import { notFound } from 'next/navigation';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjectContentLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
