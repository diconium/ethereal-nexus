'use client'

import { ProjectsDataTableRowActions } from './data-table-row-actions';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import Link from 'next/link';

export const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Name" />
    ),
    cell: ({ row }) => <Link className="text-xl font-bold" href={`/projects/${row.original.id}`}>{row.getValue("name")}</Link>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Description" />
    ),
    cell: ({ row }) => <Link className="font-normal text-base leading-4" href={`/projects/${row.original.id}`}>{row.getValue("description")}</Link>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "environments",
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Environments" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex">
        <div className="text-orange-500 text-base"> { row.getValue("environments")?.length || 0 } </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "components",
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Components" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex">
        <div className="text-orange-500 text-base"> { row.getValue("components")?.length || 0 } </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "members",
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Members" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex">
        <div className="text-orange-500 text-base"> { row.getValue("members") } </div>
      </div>
    ),
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
