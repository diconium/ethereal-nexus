'use client';

import React from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/table/columns';
import { useViewMode } from '@/components/components/projects/ProjectsViewProvider';
import { ProjectCard } from '@/components/projects/project-card';

type UpdateProjectsViewProps = {
  projects: React.ComponentProps<typeof ProjectCard>['project'][]
}

export function UpdateProjectsView({ projects }: UpdateProjectsViewProps) {
  const { viewMode } = useViewMode();

  return viewMode === 'list' ? (
    <DataTable
      colWidth
      entity={'projects'}
      columns={columns}
      data={projects}
      isShowViewOpt={false}
    />
  ) : (
    <div className="grid grid-cols-3 gap-5">
      {projects.map(project =>
        <Link key={project.id} href={`/projects/${project.id}`}>
          <ProjectCard project={project} />
        </Link>
      )
      }
    </div>
  );
}

