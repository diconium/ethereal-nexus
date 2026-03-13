'use client';

import Link from 'next/link';
import { ComponentsDataTableRowActions } from './data-table-row-actions';

export const columns = [
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ row }) => (
      <Link href={`/users/${row.original.user_id}/keys/${row.original.id}`}>
        {row.original.key}
      </Link>
    ),
  },
  {
    accessorKey: 'alias',
    header: 'Alias',
    cell: ({ row }) => (
      <Link href={`/users/${row.original.user_id}/keys/${row.original.id}`}>
        {row.original.alias}
      </Link>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ComponentsDataTableRowActions row={row} />,
  },
];
