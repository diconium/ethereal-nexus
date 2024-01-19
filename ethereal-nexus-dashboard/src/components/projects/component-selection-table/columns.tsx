'use client'

import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';

export const columns = [
  {
    id: 'name',
    accessorFn: row => row.component.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => row.getValue("name"),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "title",
    accessorFn: row => row.component.title,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => row.getValue("title"),
    enableSorting: true,
    enableHiding: true,
  },
];
