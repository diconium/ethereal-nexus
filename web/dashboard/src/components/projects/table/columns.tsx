'use client';

import { ProjectsDataTableRowActions } from './data-table-row-actions';
import Link from 'next/link';

export const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link className="font-semibold" href={`/projects/${row.original.id}`}>
        {row.getValue('name')}
      </Link>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <Link
        className="font-normal text-base leading-4"
        href={`/projects/${row.original.id}`}
      >
        {row.getValue('description')}
      </Link>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'environments',
    header: 'Environments',
    cell: ({ row }) => (
      <div className="inline-flex">
        <div className="text-accent-foreground text-base">
          {' '}
          {row.getValue('environments')?.length || 0}{' '}
        </div>
      </div>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'components',
    header: 'Components',
    cell: ({ row }) => (
      <div className="inline-flex">
        <div className="text-accent-foreground text-base">
          {' '}
          {row.getValue('components')?.length || 0}{' '}
        </div>
      </div>
    ),
    enableHiding: true,
  },
  {
    accessorKey: 'members',
    header: 'Members',
    cell: ({ row }) => (
      <div className="inline-flex">
        <div className="text-accent-foreground text-base">
          {' '}
          {row.getValue('members')}{' '}
        </div>
      </div>
    ),
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ProjectsDataTableRowActions row={row} />
      </div>
    ),
  },
];
