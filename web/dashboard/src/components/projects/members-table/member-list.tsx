import { auth } from '@/auth';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/members-table/columns';
import { getMembersByResourceId } from '@/data/member/actions';
import React from 'react';
import { MemberDialog } from './member-dialog';
import { getUsers } from '@/data/users/actions';

export async function ProjectMemberList({id}: {id: string}) {
  const session = await auth()
  const members = await getMembersByResourceId(id, session?.user?.id)
  const users = await getUsers()

  if(!members.success || !users.success) {
    throw new Error('Users are not available.')
  }

  return <DataTable
    columns={columns}
    data={members.data}
    entity={'members'}
    createSlot={
      <MemberDialog users={users.data} resource={id} />
    }
  />
}
