'use client';

import * as React from 'react';
import { ActiveSwitch } from '@/components/projects/feature-flags-table/active-switch';

export const columns = [
  {
    accessorKey: 'flag_name',
    accessorFn: (row) => row.flag_name,
    header: 'Name',
    cell: ({ row }) => <div>{row.original.flag_name}</div>,
  },
  {
    accessorKey: 'component_name',
    accessorFn: (row) => row.description,
    header: 'Component Name',
    cell: ({ row }) => <div>{row.original.component_name}</div>,
  },
  {
    accessorKey: 'description',
    accessorFn: (row) => row.description,
    header: 'Description',
    cell: ({ row }) => <div>{row.original.description}</div>,
  },
  {
    accessorKey: 'enabled',
    accessorFn: (row) => row.enabled,
    header: 'Enabled',
    cell: ({ row, table }) => {
      const { id } = row.original;
      const { projectId, environmentId, permissions, componentId } =
        table.options.meta;

      return (
        <ActiveSwitch
          disabled={permissions === 'read'}
          key={id}
          projectId={projectId}
          flagId={id}
          flagName={row.original.flag_name}
          environmentId={environmentId}
          componentId={row.original.component_id}
          enabled={row.getValue('enabled')}
        />
      );
    },
  },
];
