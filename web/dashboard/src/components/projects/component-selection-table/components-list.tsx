import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from './columns';
import React from 'react';
import { getProjectComponents } from '@/data/projects/actions';
import { auth } from '@/auth';
import { ComponentsDialog } from '@/components/projects/component-selection-table/components-dialog';
import { getComponents } from '@/data/components/actions';
export async function ProjectComponentsList({id}: {id: string}) {
  const session = await auth()
  const project = await getProjectComponents(id, session?.user?.id);
  const components = await getComponents();

  if(!project.success) {
    throw new Error(project.error.message)
  }

  return <DataTable
    columns={columns}
    data={project.data}
    meta={{
      projectId: id,
      permissions: session?.permissions[id]
    }}
    entity={'components'}
    createSlot={
      <ComponentsDialog components={components} projectId={id}/>
    }
  />
}
