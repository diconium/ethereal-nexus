'use client'

import { Checkbox } from '@/components/ui/checkbox';
import { ProjectsDataTableRowActions } from './data-table-row-actions';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => row.getValue("name"),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      row.getValue("description")
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "components",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="# Components" />
    ),
    cell: ({ row }) => (
      row.getValue("components")?.length || 0
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ table, row }) => (
      <ProjectsDataTableRowActions row={row} table={table} />
    ),
  },
];
