import React from 'react';
import { columns } from '@/components/user/table/columns';
import { getUsers } from '@/data/users/actions';
import { DataTable } from '@/components/ui/data-table/data-table';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function Teams() {
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
          <Button className="ml-auto" asChild>
            <Link href="/users/new">
              <Plus />
              <span className="text-sm font-bold">Invite user</span>
            </Link>
          </Button>
        }
      />
    </>
  );
}
