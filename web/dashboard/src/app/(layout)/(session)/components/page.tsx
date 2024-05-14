import React from 'react';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/components/table/columns';
import { getComponents } from '@/data/components/actions';
import { notFound } from 'next/navigation';

export default async function Components() {
  const components = await getComponents();

  if (!components.success) {
    notFound();
  }

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Components</h2>
          <p className="text-muted-foreground">Manage your components here!</p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={components.data}
        entity='components'
      />
    </div>
  );
}
