import { Separator } from '@/components/ui/separator';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getUserById } from '@/data/users/actions';
import { ApiKeyList } from '@/components/user/api-key-table/api-key-list';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/table/columns';
import React from 'react';

export default async function UserPage({ params: { id } }: any) {
  const session = await auth();
  const user = await getUserById(session?.user?.id);

  if (!user.success || id !== session?.user?.id) {
    notFound();
  }

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome {user.data.name}</h2>
          <p className="text-muted-foreground">User Settings</p>
        </div>
      </div>
      <Separator />
      <ApiKeyList />
    </div>
  );
}
