import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from './columns';
import React from 'react';
import {
  getComponentsNotInEnvironment,
  getEnvironmentComponents,
  getEnvironmentsByProject
} from '@/data/projects/actions';
import { auth } from '@/auth';
import { ComponentsDialog } from '@/components/projects/component-selection-table/components-dialog';

export async function ProjectComponentsList({ id, environment }: { id: string, environment: string }) {
  const session = await auth();

  const environments = await getEnvironmentsByProject(id, session?.user?.id);
  if (!environments.success) {
    throw new Error(environments.error.message);
  }
  const selected = environment || environments.data[0].id;

  const components = await getComponentsNotInEnvironment(selected, session?.user?.id);
  const project = await getEnvironmentComponents(selected, session?.user?.id);
  if (!project.success) {
    throw new Error(project.error.message);
  }

  return <DataTable
    columns={columns}
    data={project.data}
    meta={{
      projectId: id,
      environmentId: selected,
      permissions: session?.permissions[id]
    }}
    entity={'components'}
    createSlot={
      <ComponentsDialog
        components={components}
        environment={selected}
        project={id}
        environments={environments.data}
      />
    }
  />;
}
