"use client"

import React from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/table/columns';
import { useViewMode } from '@/components/components/projects/ProjectsViewProvider';
import { ProjectCard } from '@/components/projects/project-card';
import type { Project } from '@/data/projects/dto';

export function UpdateProjectsView({ projects}) {
  const { viewMode } = useViewMode();

  const [data, setData] = React.useState<Project[]>(projects.data ?? []);

  const deleteData = (id: string) => {
    setData((previous: Project[]) => previous.filter((project) => project.id !== id));
  };


  return (
    <>
      {viewMode === 'list' ? (
          projects.success ?
            <DataTable
              colWidth
              entity={'projects'}
              columns={columns}
              data={data}
              isShowViewOpt={false}
              meta={{  deleteData }}
            /> :
            projects.error.message

        ) :
        <div className="grid grid-cols-3 gap-5">
          {projects.success ? (
            projects.data.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <ProjectCard project={project} />
              </Link>
            ))
          ) : (
            <p>{projects.error.message}</p>
          )}
        </div>

      }
    </>
  );
}

