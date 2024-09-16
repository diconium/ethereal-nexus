import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from './columns';
import React from 'react';
import { getComponentsNotInEnvironment, getEnvironmentComponents } from '@/data/projects/actions';
import { auth } from '@/auth';
import { ComponentsDialog } from '@/components/projects/component-selection-table/components-dialog';

export async function ProjectComponentsList({id, environment}: {id: string, environment: string }) {
  const session = await auth()
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
      environmentId: environment,
      permissions: session?.permissions[id]
    }}
    entity={'components'}
    createSlot={
      <ComponentsDialog components={components} environment={environment} project={id}/>
    }
  />
}
