import React from 'react';
import { HeaderBreadcrumbInjector } from '@/components/projects/header-breadcrumb-injector';
import { getProjects, getEnvironmentsByProject } from '@/data/projects/actions';
import { notFound } from 'next/navigation';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [projectsResult, environmentsResult] = await Promise.all([
    getProjects(),
    getEnvironmentsByProject(id),
  ]);

  if (!projectsResult.success) notFound();

  const projects = projectsResult.data.map((p) => ({ id: p.id, name: p.name }));
  const currentProject = projects.find((p) => p.id === id);
  if (!currentProject) notFound();

  const environments = environmentsResult.success
    ? environmentsResult.data.map((e) => ({ id: e.id, name: e.name }))
    : [];

  return (
    <>
      <HeaderBreadcrumbInjector
        projects={projects}
        currentProject={currentProject}
        environments={environments}
      />
      {children}
    </>
  );
}
