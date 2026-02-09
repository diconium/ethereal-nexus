'use client';

import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import * as React from 'react';
import { ActiveSwitch } from '@/components/projects/feature-flags-table/active-switch';

export const columns = [
	{
		accessorKey: 'flag_name',
		accessorFn: (row) => row.flag_name,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Name' />
		),
		cell: ({ row }) => <div>{row.original.flag_name}</div>,
		enableSorting: true,
	},
  {
    accessorKey: 'component_name',
    accessorFn: (row) => row.description,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Component Name' />
    ),
    cell: ({ row }) => <div>{row.original.component_name}</div>,
    enableSorting: true,
  },
	{
		accessorKey: 'description',
		accessorFn: (row) => row.description,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Description' />
		),
		cell: ({ row }) => <div>{row.original.description}</div>,
		enableSorting: true,
	},
	{
		accessorKey: 'enabled',
		accessorFn: (row) => row.enabled,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Enabled' />
		),
    cell: ({ row, table }) => {
      const {id} = row.original;

      const {projectId, environmentId, permissions, componentId} = table.options.meta;

      return <ActiveSwitch
        disabled={permissions === 'read'}
        key={id}
        projectId={projectId}
        flagId={id}
        flagName={row.original.flag_name}
        environmentId={environmentId}
        componentId={row.original.component_id}
        enabled={row.getValue("enabled")}
      />
    },
		enableSorting: true,
	}
];
