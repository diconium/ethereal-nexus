import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from './columns';
import React from 'react';
import { getProjectComponents } from '@/data/projects/actions';
import { auth } from '@/auth';

export async function ProjectComponentsList({ id }: { id: string }) {
  const session = await auth();
  const project = await getProjectComponents(id, session?.user?.id);

  if (!project.success) {
    throw new Error(project.error.message);
  }

  return (
    <DataTable
      columns={columns}
      data={project.data.components}
      entity={'components'}
    />
  );
}
