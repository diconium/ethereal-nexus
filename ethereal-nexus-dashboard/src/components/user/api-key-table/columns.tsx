'use client'

import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import Link from 'next/link';
import { ComponentsDataTableRowActions } from './data-table-row-actions';

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
    accessorKey: "key",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Key" />
    ),
    cell: ({ row }) => <Link href={`/users/${row.original.user_id}/keys/${row.original.id}`}> {row.original.key}</Link>,
    enableSorting: true,
  },
  {
    accessorKey: "alias",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Alias" />
    ),
    cell: ({ row }) => <Link href={`/users/${row.original.user_id}/keys/${row.original.id}`}> {row.original.alias}</Link>,
    enableSorting: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created Date" />
    ),
    cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return date.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    enableSorting: true,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <ComponentsDataTableRowActions row={row} />
    ),
  },
];
