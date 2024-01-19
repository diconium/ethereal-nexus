import React from "react";
import { DataTable } from '@/components/ui/data-table/data-table';
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { columns } from '@/components/projects/table/columns';

export default async function Projects() {
  const session = await auth()
  const projects = await getProjects(session?.user?.id);

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Manage your projects here!</p>
        </div>
      </div>
      {
        projects.success ?
          <DataTable
            entity={'projects'}
            columns={columns}
            data={projects.data}
          /> :
          projects.error.message
      }
    </div>
  );
}
