'use client';

import { ComponentsDataTableRowActions } from './data-table-row-actions';
import Link from 'next/link';
import * as React from 'react';
import { Sparkles } from 'lucide-react';

export const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <Link className="font-semibold" href={`/components/${row.original.id}`}>
          {row.getValue('name')}
        </Link>
        {row.original.is_ai_generated && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-accent text-accent-foreground relative overflow-hidden group">
            <Sparkles className="w-3 h-3 mr-1 text-accent-foreground" />
            AI
          </span>
        )}
      </div>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <Link href={`/components/${row.original.id}`}>
        {row.getValue('title')}
      </Link>
    ),
    enableHiding: true,
  },
  {
    id: 'version',
    accessorFn: (row) => row.versions[0],
    header: 'Version',
    cell: ({ row }) => row.getValue('version'),
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ table, row }) => (
      <div className="flex justify-end">
        <ComponentsDataTableRowActions row={row} />
      </div>
    ),
  },
];
