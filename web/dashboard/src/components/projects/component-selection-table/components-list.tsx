import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from './columns';
import React from 'react';
import { getComponentsNotInEnvironment, getEnvironmentComponents } from '@/data/projects/actions';
import { auth } from '@/auth';
import { ComponentsDialog } from '@/components/projects/component-selection-table/components-dialog';

export async function ProjectComponentsList({id}: {id: string}) {
  const session = await auth()
  const environment = '389e0fbf-3815-46fd-84ac-97fdfb7bfff2';
  const project = await getEnvironmentComponents(environment, session?.user?.id);
  const components = await getComponentsNotInEnvironment(environment, session?.user?.id);

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
       <ComponentsDialog components={components} environment={environment} project={id}/>
    }
  />
}
