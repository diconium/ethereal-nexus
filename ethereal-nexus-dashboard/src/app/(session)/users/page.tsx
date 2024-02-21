import React from "react";
import { columns } from '@/components/user/table/columns';
import { getUsers } from '@/data/users/actions';
import { DataTable } from '@/components/ui/data-table/data-table';
import Link from "next/link";
import { buttonVariants } from '@/components/ui/button';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { auth } from '@/auth';

export default async function Teams() {
  const session = await auth()
  const users = await getUsers()
  console.log(session?.user)
  if(session?.user?.role !== 'admin') {
    throw new Error('NotAuthorized');
  }

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage your users here</p>
        </div>
      </div>
      {
        users.success ?
          <DataTable
            entity={'users'}
            createSlot={
              <Link
                href={'/users/new'}
                passHref
                className={
                  buttonVariants(
                    {
                      variant: "outline",
                      size: 'sm',
                      className: "ml-auto hidden h-8 lg:flex mr-4" }
                  )
                }>
                <PlusCircledIcon className="mr-2 h-4 w-4" />
                Create user
              </Link>
            }
            columns={columns}
            data={users.data}
          /> :
          users.error.message
      }
    </div>
  );
}
