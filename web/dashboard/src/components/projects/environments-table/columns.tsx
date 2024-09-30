'use client';

import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import * as React from 'react';
import { ActiveSwitch } from './active-switch';
import { ProjectsDataTableRowActions } from '@/components/projects/table/data-table-row-actions';
import { EnvironmentsRowActions } from '@/components/projects/environments-table/actions';

export const columns = [
  {
    accessorKey: 'name',
    accessorFn: (row) => {
      return row.name;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.original.name}</div>,
    enableSorting: true
  },
  {
    accessorKey: 'description',
    accessorFn: (row) => {
      return row.description;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => <div>{row.original.description}</div>,
    enableSorting: true
  },
  {
    id: "secure",
    accessorFn: row => row.secure,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Secure" />
    ),
    cell: ({ row, table }) => {
      const { permissions } = table.options.meta;

      return <ActiveSwitch
        disabled={permissions !== 'write'}
        key={row.original.id}
        environment={row.original}
        active={row.getValue("secure")}
      />
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end" >
        <EnvironmentsRowActions row={row} />
      </div>
    ),
  },
];
