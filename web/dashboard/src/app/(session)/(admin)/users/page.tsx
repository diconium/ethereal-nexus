import React from 'react';
import { columns } from '@/components/user/table/columns';
import { getUsers } from '@/data/users/actions';
import { DataTable } from '@/components/ui/data-table/data-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';

export default async function Teams() {

  const session = await auth()
  if(session?.user?.role !== 'admin') {
    notFound();
  }

  const users = await getUsers();

  if(!users.success) {
    notFound();
  }

  return (
    <>
      <h1 className="text-4xl font-semibold">Users</h1>
      <p className="mb-10">Manage your users here</p>
      <DataTable
        entity={'users'}
        columns={columns}
        data={users.data}
        filterColumn={'name'}
        createSlot={
          <Button className="ml-auto" asChild size="sm">
            <Link href="/users/new">
              <Plus data-icon="inline-start" />
              Invite user
            </Link>
          </Button>
        }
      />
    </>
  );
}
