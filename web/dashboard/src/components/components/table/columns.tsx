"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { ComponentsDataTableRowActions } from "./data-table-row-actions";
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import Link from "next/link";
import * as React from "react";

export const columns = [
  {
    id: "select",
    header: ({ table }: any) => (
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
    cell: ({ row }) => <Link href={`/components/${row.original.id}`}>{row.getValue("name")}</Link>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => <Link href={`/components/${row.original.id}`}>{row.getValue("title")}</Link>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: 'version',
    accessorFn: row => row.versions[0].version,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Version" />
    ),
    cell: ({ row }) => (
      row.getValue("version")
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "actions",
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Permissions" />
    ),
    cell: ({ row }) => (
      <ComponentsDataTableRowActions row={row} />
    ),
  },
];
