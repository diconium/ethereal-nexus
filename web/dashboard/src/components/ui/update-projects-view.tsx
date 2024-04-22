"use client"

import React from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/table/columns';
import { useViewMode } from '@/components/components/projects/ProjectsViewProvider';
import { ProjectCard } from '@/components/projects/project-card';

export function UpdateProjectsView({ projects}) {
  const { viewMode } = useViewMode();

  return (
    <>
      {viewMode === 'list' ? (

          projects.success ?
            <DataTable
              colWidth
              entity={'projects'}
              columns={columns}
              data={projects.data}
              isShowViewOpt={false}
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

