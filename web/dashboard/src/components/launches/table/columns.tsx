'use client';

import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';

export const columns = [
  {
    id: 'name',
    accessorFn: row => row.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <span>{row.getValue("name")}</span>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: 'title',
    accessorFn: row => row.title,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => <span>{row.getValue("title")}</span>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "version",
    accessorFn: row => row.version,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Version" />
    ),
    cell: ({ row }) => <span>{row.getValue("version").to} &rarr; {row.getValue("version").from}</span>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "active",
    accessorFn: row => row.is_active,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Active" />
    ),
    cell: ({ row }) => <span>{row.getValue("active").to ? 'Active' : 'Inactive'} &rarr; {row.getValue("active").from ? 'Active' : 'Inactive'}</span>,
    enableSorting: false,
    enableHiding: true,
  },
];
