import { auth } from '@/auth';
import { DataTable } from '@/components/ui/data-table/data-table';
import React from 'react';
import { getEnvironmentsByProject } from '@/data/projects/actions';
import { columns } from './columns';
import { EnvironmentDialog } from '@/components/projects/environments-table/environment-dialog';

export async function EnvironmentsList({id}: {id: string}) {
  const session = await auth()
  const environments = await getEnvironmentsByProject(id, session?.user?.id)


  if(!environments.success) {
    throw new Error('Users are not available.')
  }

  return <DataTable
    columns={columns}
    meta={{
      projectId: id,
      permissions: session?.permissions[id]
    }}
    data={environments.data}
    entity={'members'}
    createSlot={
      <EnvironmentDialog resource={id} />
    }
  />
}
