import { auth } from '@/auth';
import { DataTable } from '@/components/ui/data-table/data-table';
import React from 'react';
import { getEnvironmentsByProject } from '@/data/projects/actions';
import { columns } from './columns';
import { EnvironmentDialog } from '@/components/projects/environments-table/environment-dialog';

export async function EnvironmentsList({id}: {id: string}) {
  const session = await auth();
  const role = session?.user?.role;

  const environments = await getEnvironmentsByProject(id);
  if(!environments.success) {
    throw new Error('Users are not available.')
  }

  return <DataTable
    columns={columns}
    filterColumn={'name'}
    meta={{
      projectId: id,
      permissions: role !== 'admin' ? session?.permissions[id] : 'write'
    }}
    data={environments.data}
    entity={'members'}
    createSlot={
      <EnvironmentDialog resource={id} />
    }
  />
}
