'use client'

import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Switch } from '@/components/ui/switch';
import { ActiveSwitch } from '@/components/projects/component-selection-table/active-switch';

export const columns = [
  {
    id: 'name',
    accessorFn: row => row.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => row.getValue("name"),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "title",
    accessorFn: row => row.title,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => row.getValue("title"),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "version",
    accessorFn: row => row.version,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Version" />
    ),
    cell: ({ row }) => row.getValue("version"),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "active",
    accessorFn: row => row.is_active,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Active" />
    ),
    cell: ({ row, table }) => (
      <ActiveSwitch
        projectId={table.options.meta.projectId}
        componentId={row.original.id}
        active={row.getValue("active")}
      />
    ),
    enableSorting: false,
    enableHiding: true,
  },
];
