'use client';

import * as React from 'react';
import { ActiveSwitch } from './active-switch';
import { EnvironmentsRowActions } from '@/components/projects/environments-table/actions';

export const columns = [
  {
    accessorKey: 'name',
    accessorFn: (row) => row.name,
    header: 'Name',
    cell: ({ row }) => <div>{row.original.name}</div>,
  },
  {
    accessorKey: 'description',
    accessorFn: (row) => row.description,
    header: 'Description',
    cell: ({ row }) => <div>{row.original.description}</div>,
  },
  {
    id: 'secure',
    accessorFn: (row) => row.secure,
    header: 'Secure',
    cell: ({ row, table }) => {
      const { permissions } = table.options.meta;

      return (
        <ActiveSwitch
          disabled={permissions === 'read'}
          key={row.original.id}
          environment={row.original}
          active={row.getValue('secure')}
        />
      );
    },
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <EnvironmentsRowActions row={row} />
      </div>
    ),
  },
];
