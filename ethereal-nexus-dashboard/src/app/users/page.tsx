import React from "react";
import { columns } from '@/components/user/table/columns';
import { getUsers } from '@/data/users/actions';
import { DataTable } from '@/components/ui/data-table/data-table';

export default async function Teams() {
  const users = await getUsers()

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
            handlerPath={'/users/new'}
            columns={columns}
            data={users.data}
          /> :
          users.error.message
      }
    </div>
  );
}
