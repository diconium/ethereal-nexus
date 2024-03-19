'use client'

import { ProjectsDataTableRowActions } from './data-table-row-actions';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import Link from 'next/link';

export const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader className="text-xs font-bold" column={column} title="Name" />
    ),
    cell: ({ row }) => <Link className="text-2xl font-bold" href={`/projects/${row.original.id}`}>{row.getValue("name")}</Link>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader className="text-xs font-bold" column={column} title="Description" />
    ),
    cell: ({ row }) => <Link className="font-normal text-base leading-4" href={`/projects/${row.original.id}`}>{row.getValue("description")}</Link>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "components",
    header: ({ column }) => (
      <DataTableColumnHeader className="text-xs font-bold" column={column} title="Components" />
    ),
    cell: ({ row }) => ( <div className="text-orange-500"> {row.getValue("components")?.length || 0}</div> ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ table, row }) => (
      <div className="flex justify-end" >
        <ProjectsDataTableRowActions row={row} table={table} />
      </div>

    ),
  },
];
