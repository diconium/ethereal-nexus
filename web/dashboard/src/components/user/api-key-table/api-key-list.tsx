import { auth } from '@/auth';
import { DataTable } from '@/components/ui/data-table/data-table';
import React from 'react';
import { columns } from './columns';
import {getApiKeys} from '@/data/users/actions';
import { ApiKeyDialog } from '@/components/user/api-key-table/api-key-dialog';
import { getProjects } from '@/data/projects/actions';

export async function ApiKeyList() {
  const session = await auth()
  const keys = await getApiKeys(session?.user?.id)
  const projects = await getProjects({ forceMember: true })

  if(!keys.success) {
    throw new Error('Keys are not available.')
  }

  return <DataTable
    columns={columns}
    data={keys.data}
    entity={'api key'}
    createSlot={
      <ApiKeyDialog userId={session?.user?.id} availableProjects={projects.success ? projects.data : []} />
    }
  />
}
