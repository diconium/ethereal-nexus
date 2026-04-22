import Link from 'next/link';
import { getProjectById } from '@/data/projects/actions';
import { notFound } from 'next/navigation';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjectAiLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="space-y-2">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {project.data.name} Agentic AI
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage AI features per project environment with authenticated
            dashboard workflows and versioned endpoints.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
