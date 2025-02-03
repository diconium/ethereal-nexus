import React from 'react';
import { columns } from '@/components/user/table/columns';
import { getUsers } from '@/data/users/actions';
import { DataTable } from '@/components/ui/data-table/data-table';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default async function Teams() {
  const users = await getUsers()

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="w-full flex items-end">
        <div className="mr-auto">
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage your users here</p>
        </div>
        <Link
          href="/users/new"
          passHref
          className={cn(
            buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'mr-2 transition-colors bg-orange-500 rounded-full text-white h-9 px-5 flex justify-center items-center',
            })
          )}
        >
          <Plus />
          <span className="text-sm font-bold">Invite user</span>
        </Link>
      </div>
      {
        users.success ?
          <DataTable
            entity={'users'}
            columns={columns}
            data={users.data}
            filterColumn={'name'}
          /> :
          users.error.message
      }
    </div>
  );
}
