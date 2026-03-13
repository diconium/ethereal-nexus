'use client';

import { useLayoutEffect } from 'react';
import { useHeaderSlot } from '@/components/ui/sidebar/header-slot-context';
import { ProjectBreadcrumb } from '@/components/projects/project-breadcrumb';

type Project = { id: string; name: string };
type Environment = { id: string; name: string };

type HeaderBreadcrumbInjectorProps = {
  projects: Project[];
  currentProject: Project;
  environments: Environment[];
};

export function HeaderBreadcrumbInjector({
  projects,
  currentProject,
  environments,
}: HeaderBreadcrumbInjectorProps) {
  const { setBreadcrumb } = useHeaderSlot();

  useLayoutEffect(() => {
    setBreadcrumb(
      <ProjectBreadcrumb
        projects={projects}
        currentProject={currentProject}
        environments={environments}
      />,
    );

    return () => {
      setBreadcrumb(null);
    };
  }, [projects, currentProject, environments, setBreadcrumb]);

  return null;
}
