"use client";

import { ComponentsDataTableRowActions } from "./data-table-row-actions";
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import Link from "next/link";
import * as React from "react";
import { Sparkles } from "lucide-react";

export const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>
      <Link className="font-semibold" href={`/components/${row.original.id}`}>{row.getValue("name")}</Link>
      {row.original.is_ai_generated && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 relative overflow-hidden group">
            <Sparkles className="w-3 h-3 mr-1 text-orange-500" />
            AI
          </span>
      )}
    </div>,
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
    cell: ({ table, row }) => (
      <div className="flex justify-end" >
        <ComponentsDataTableRowActions row={row} />
      </div>
    ),
  },
];
